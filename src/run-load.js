// A loader continuation belongs to one scene run. Shutdown cancels it;
// completion may perform work only while that same run is still active.
export function onRunLoad(scene, event, after) {
  const run = scene.runId, L = scene.load;
  let settled = false;
  const detach = () => {
    if (settled) return false;
    settled = true;
    L.off?.(event, finish);
    scene.events?.off?.('shutdown', detach);
    return true;
  };
  const finish = () => {
    if (detach() && scene.runId === run) after?.();
  };
  L.once?.(event, finish);
  scene.events?.once?.('shutdown', detach);
  return detach;
}
