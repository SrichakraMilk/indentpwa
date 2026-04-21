const fs = require('fs');

function linkedEntityId(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const obj = value;
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return String(value);
}

// Emulate Prasad profile
const agent = {
  _id: "69d3a4fd4f983af69575d618",
  userId: "69d3a4fd4f983af69575d618",
  branch: null
};

// Emulate the indent
const indent = {
  _id: "69e75a2b2a6702f41d483510",
  status: "Pending",
  currentStep: "AM",
  agent: { _id: "agentUser123" }, // Different user
  createdBy: { _id: "agentUser123" },
  executive: null,
  branchManager: null,
  areaManager: { 
    _id: "69d3a4fd4f983af69575d618", 
    fname: "Para", 
    lname: "" 
  },
  branch: {
    _id: "69d3a5494f983af69575d62f",
    executive: null,
    branchManager: null,
    areaManager: "69d3a4fd4f983af69575d618" // This is what populate without nested returns? Wait. populate('branch') returns just the branch doc. We recently added `"name code executive branchManager areaManager"`. So it returns those objectIds.
  }
};

const myIds = [agent._id, agent.id, agent.userId].filter(Boolean).map(id => String(id));
const targetAgentId = linkedEntityId(indent.agent);
const targetCreatorId = linkedEntityId(indent.createdBy);

const isMyIndent = myIds.some(myId => 
  myId === String(targetAgentId || '') || 
  myId === String(targetCreatorId || '') ||
  myId === String(linkedEntityId(indent.executive) || '') ||
  myId === String(linkedEntityId(indent.branchManager) || '') ||
  myId === String(linkedEntityId(indent.areaManager) || '') ||
  myId === String(linkedEntityId(indent.branch?.executive) || '') ||
  myId === String(linkedEntityId(indent.branch?.branchManager) || '') ||
  myId === String(linkedEntityId(indent.branch?.areaManager) || '')
);

const userBranchId = String(linkedEntityId(agent?.branch) || '');
const indentBranchId = String(linkedEntityId(indent.branch) || '');
const isMyBranch = !!userBranchId && userBranchId === indentBranchId;

const userRoleCode = "AM";
const isGM = false;
const isAE = false;
const isAI = false;

// Corporate oversight: GM+, AE, AI usually see everything or use API filtering
const isCorporate = isGM || isAE || isAI || userRoleCode === 'ADMIN';

// Final ownership check: I can see it if it's mine, my branch, OR I am corporate
const canView = isMyIndent || isMyBranch || isCorporate;

console.log("canView:", canView);
console.log("isMyIndent:", isMyIndent);
