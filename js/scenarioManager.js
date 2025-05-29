
export async function loadScenarios(){
  const res = await fetch("assets/scenarios.json");
  return await res.json();
}

export function getScenarioByName(list, name){
  return list.find(s => s.name === name) || list[0];
}
