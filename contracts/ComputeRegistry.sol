// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ComputeRegistry — EV-LLM decentralized compute network
 *
 * Node operators stake ETH to register hardware. The oracle (Vercel backend)
 * settles completed inference jobs, deducting user credits and crediting nodes.
 * Nodes withdraw earnings at any time; stake is returned on deregistration.
 *
 * Deploy on Sepolia for testing, Ethereum mainnet for production.
 */
contract ComputeRegistry {

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant HEARTBEAT_WINDOW = 5 minutes;
    uint256 public constant WEI_PER_TOKEN = 1e9; // 1 token = 1 gwei worth of ETH

    // ── State ─────────────────────────────────────────────────────────────────

    address public owner;
    address public oracle;

    struct Node {
        address operator;
        bytes32 hardwareFingerprint; // keccak256(gpu+cpu+disk serials)
        uint256 benchmarkScore;      // tokens/sec × 100 (fixed-point)
        uint256 vramGb;
        uint256 ramGb;
        uint256 stake;
        uint256 earnings;            // claimable ETH
        bool    active;
        uint256 registeredAt;
        uint256 lastHeartbeat;
        string  ollamaUrl;           // reported by agent; not trusted for security
        string  agentVersion;
    }

    struct Job {
        address   user;
        address[] nodes;
        uint256   tokensUsed;
        uint256   costWei;
        bool      settled;
        uint256   settledAt;
    }

    mapping(address => Node)    public nodes;
    mapping(bytes32 => Job)     public jobs;
    mapping(address => uint256) public userCredits; // in wei

    address[] internal _allNodes;

    // ── Events ────────────────────────────────────────────────────────────────

    event NodeRegistered(address indexed operator, bytes32 fingerprint, uint256 vramGb, uint256 stake);
    event NodeUpdated(address indexed operator, uint256 benchmarkScore, uint256 vramGb);
    event NodeDeregistered(address indexed operator, uint256 returned);
    event HeartbeatReceived(address indexed operator, uint256 timestamp);
    event CreditsPurchased(address indexed user, uint256 weiAmount);
    event JobSettled(bytes32 indexed jobHash, address indexed user, uint256 tokensUsed, uint256 costWei);
    event EarningsClaimed(address indexed operator, uint256 amount);
    event OracleChanged(address indexed previous, address indexed next);

    // ── Errors ────────────────────────────────────────────────────────────────

    error InsufficientStake(uint256 sent, uint256 required);
    error AlreadyRegistered();
    error NodeNotFound();
    error NodeInactive();
    error Unauthorized();
    error JobAlreadySettled();
    error InsufficientCredits(uint256 have, uint256 need);
    error NothingToClaim();
    error TransferFailed();
    error EmptyNodeList();

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert Unauthorized();
        _;
    }

    modifier nodeExists(address op) {
        if (nodes[op].registeredAt == 0) revert NodeNotFound();
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _oracle) {
        owner  = msg.sender;
        oracle = _oracle;
    }

    // ── Node registration ─────────────────────────────────────────────────────

    /**
     * @notice Register this wallet as a compute node.
     * @param fingerprint   keccak256 of hardware serials (GPU + CPU + disk)
     * @param benchmarkScore tokens/sec × 100 from the benchmark test
     * @param vramGb        GPU VRAM in whole gigabytes
     * @param ramGb         System RAM in whole gigabytes
     * @param ollamaUrl     Public Ollama URL (informational only)
     * @param agentVersion  Agent software version string
     */
    function registerNode(
        bytes32 fingerprint,
        uint256 benchmarkScore,
        uint256 vramGb,
        uint256 ramGb,
        string  calldata ollamaUrl,
        string  calldata agentVersion
    ) external payable {
        if (msg.value < MIN_STAKE) revert InsufficientStake(msg.value, MIN_STAKE);
        if (nodes[msg.sender].active) revert AlreadyRegistered();

        nodes[msg.sender] = Node({
            operator:            msg.sender,
            hardwareFingerprint: fingerprint,
            benchmarkScore:      benchmarkScore,
            vramGb:              vramGb,
            ramGb:               ramGb,
            stake:               msg.value,
            earnings:            0,
            active:              true,
            registeredAt:        block.timestamp,
            lastHeartbeat:       block.timestamp,
            ollamaUrl:           ollamaUrl,
            agentVersion:        agentVersion
        });

        _allNodes.push(msg.sender);

        emit NodeRegistered(msg.sender, fingerprint, vramGb, msg.value);
    }

    /**
     * @notice Update node hardware stats (e.g. after a re-benchmark).
     */
    function updateNode(
        uint256 benchmarkScore,
        uint256 vramGb,
        uint256 ramGb,
        string calldata ollamaUrl,
        string calldata agentVersion
    ) external nodeExists(msg.sender) {
        Node storage n = nodes[msg.sender];
        if (!n.active) revert NodeInactive();
        n.benchmarkScore = benchmarkScore;
        n.vramGb         = vramGb;
        n.ramGb          = ramGb;
        n.ollamaUrl      = ollamaUrl;
        n.agentVersion   = agentVersion;
        n.lastHeartbeat  = block.timestamp;
        emit NodeUpdated(msg.sender, benchmarkScore, vramGb);
    }

    /**
     * @notice Keep the node marked as online. Called by the agent every 60 s.
     */
    function heartbeat() external nodeExists(msg.sender) {
        if (!nodes[msg.sender].active) revert NodeInactive();
        nodes[msg.sender].lastHeartbeat = block.timestamp;
        emit HeartbeatReceived(msg.sender, block.timestamp);
    }

    /**
     * @notice Deregister and withdraw stake + all earnings.
     */
    function deregisterNode() external nodeExists(msg.sender) {
        Node storage n = nodes[msg.sender];
        if (!n.active) revert NodeInactive();

        n.active = false;
        uint256 amount = n.stake + n.earnings;
        n.stake    = 0;
        n.earnings = 0;

        _removeFromList(msg.sender);

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit NodeDeregistered(msg.sender, amount);
    }

    /**
     * @notice Claim accumulated inference earnings without deregistering.
     */
    function claimEarnings() external nodeExists(msg.sender) {
        uint256 amount = nodes[msg.sender].earnings;
        if (amount == 0) revert NothingToClaim();
        nodes[msg.sender].earnings = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit EarningsClaimed(msg.sender, amount);
    }

    // ── User credit management ────────────────────────────────────────────────

    /**
     * @notice Buy compute credits. 1 wei = 1 credit unit.
     */
    function purchaseCredits() external payable {
        if (msg.value == 0) revert InsufficientCredits(0, 1);
        userCredits[msg.sender] += msg.value;
        emit CreditsPurchased(msg.sender, msg.value);
    }

    // ── Oracle settlement ─────────────────────────────────────────────────────

    /**
     * @notice Called by the Vercel oracle after a job completes.
     * @param jobHash   keccak256(jobId) as a unique identifier
     * @param user      Address of the user who submitted the job
     * @param jobNodes  Array of node operators that served the job
     * @param tokensUsed Total tokens generated
     * @param costWei   Total cost in wei deducted from user credits
     */
    function settleJob(
        bytes32   jobHash,
        address   user,
        address[] calldata jobNodes,
        uint256   tokensUsed,
        uint256   costWei
    ) external onlyOracle {
        if (jobNodes.length == 0) revert EmptyNodeList();
        if (jobs[jobHash].settled) revert JobAlreadySettled();
        if (userCredits[user] < costWei) revert InsufficientCredits(userCredits[user], costWei);

        userCredits[user] -= costWei;

        // Split earnings equally among all contributing nodes
        uint256 perNode = costWei / jobNodes.length;
        uint256 remainder = costWei - (perNode * jobNodes.length);

        for (uint256 i = 0; i < jobNodes.length; i++) {
            if (nodes[jobNodes[i]].active) {
                nodes[jobNodes[i]].earnings += perNode;
            }
        }
        // Remainder goes to first node
        if (remainder > 0 && nodes[jobNodes[0]].active) {
            nodes[jobNodes[0]].earnings += remainder;
        }

        // Store job record (nodes array stored separately via events for gas)
        jobs[jobHash] = Job({
            user:       user,
            nodes:      jobNodes,
            tokensUsed: tokensUsed,
            costWei:    costWei,
            settled:    true,
            settledAt:  block.timestamp
        });

        emit JobSettled(jobHash, user, tokensUsed, costWei);
    }

    // ── View functions ────────────────────────────────────────────────────────

    /**
     * @notice Returns all node operators with a fresh heartbeat.
     */
    function getLiveNodes() external view returns (address[] memory) {
        uint256 cutoff = block.timestamp >= HEARTBEAT_WINDOW
            ? block.timestamp - HEARTBEAT_WINDOW
            : 0;

        uint256 count = 0;
        for (uint256 i = 0; i < _allNodes.length; i++) {
            Node storage n = nodes[_allNodes[i]];
            if (n.active && n.lastHeartbeat >= cutoff) count++;
        }

        address[] memory live = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _allNodes.length; i++) {
            Node storage n = nodes[_allNodes[i]];
            if (n.active && n.lastHeartbeat >= cutoff) {
                live[idx++] = _allNodes[i];
            }
        }
        return live;
    }

    function getNode(address op) external view returns (Node memory) {
        return nodes[op];
    }

    function getUserCredits(address user) external view returns (uint256) {
        return userCredits[user];
    }

    function totalNodes() external view returns (uint256) {
        return _allNodes.length;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setOracle(address _oracle) external onlyOwner {
        emit OracleChanged(oracle, _oracle);
        oracle = _oracle;
    }

    function transferOwnership(address _owner) external onlyOwner {
        owner = _owner;
    }

    /**
     * @notice Emergency: slash a misbehaving node (stake sent to treasury).
     */
    function slashNode(address op, address treasury) external onlyOwner nodeExists(op) {
        Node storage n = nodes[op];
        uint256 slashed = n.stake;
        n.stake  = 0;
        n.active = false;
        _removeFromList(op);
        (bool ok, ) = treasury.call{value: slashed}("");
        if (!ok) revert TransferFailed();
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _removeFromList(address op) internal {
        for (uint256 i = 0; i < _allNodes.length; i++) {
            if (_allNodes[i] == op) {
                _allNodes[i] = _allNodes[_allNodes.length - 1];
                _allNodes.pop();
                return;
            }
        }
    }

    // Accept ETH as credit top-up
    receive() external payable {
        userCredits[msg.sender] += msg.value;
        emit CreditsPurchased(msg.sender, msg.value);
    }
}
