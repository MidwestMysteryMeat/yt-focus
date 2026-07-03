// YT Focus — background script.
// Single job: the pause/resume keyboard shortcut (see manifest
// "commands"). The flipped value reaches every tab via storage.onChanged.
browser.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-focus') return;
  const settings = await loadSettings();
  await STORE.set({ enabled: !settings.enabled });
});
