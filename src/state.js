
const presets={North:{in:3,out:2,moves:['LS','S','R']},East:{in:3,out:2,moves:['LS','S','SR']},South:{in:4,out:2,moves:['L','LS','S','R']},West:{in:3,out:2,moves:['LS','S','R']}};
const moves=['L','S','R','LS','SR','LR','LSR'];
const labels={L:'Left only',S:'Straight only',R:'Right only',LS:'Left + straight',SR:'Straight + right',LR:'Left + right',LSR:'Left + straight + right'};
let state={circulating:3,diameter:38,width:4,displayScale:9.5,laneNumbers:true,showRoutes:false,showTrails:true,showConflictZones:true,entryPriority:{North:'give-way',East:'give-way',South:'give-way',West:'give-way'},exitLaneModes:{North:'conventional',East:'conventional',South:'conventional',West:'conventional'},exitLaneConnectors:{},arms:structuredClone(presets)};
let active='North';
const defaultVehicles=()=>({A:{arm:'North',side:'entry',lane:1,speed:20},B:{arm:'South',side:'exit',lane:1,speed:15}});
state.vehicles=defaultVehicles();
state.drivingMode='safe';state.minGap=8;
// Exit choices derive from the entry lane's permitted turn movements.
