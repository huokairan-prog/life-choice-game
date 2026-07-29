/* localStorage 存档、导入与导出。任何异常都不会阻止玩家重新开始。 */
(function () {
  const SAVE_KEY = 'hkr-life-choice-save-v1';

  function hasSave() {
    try {
      return Boolean(localStorage.getItem(SAVE_KEY));
    } catch (_) {
      return false;
    }
  }

  function saveGame(player) {
    try {
      const safe = JSON.stringify({ savedAt: Date.now(), player });
      localStorage.setItem(SAVE_KEY, safe);
      return true;
    } catch (error) {
      console.warn('存档失败：', error);
      return false;
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.player) return null;
      return window.LIFE_PLAYER.normalizePlayer(parsed.player);
    } catch (error) {
      console.warn('存档读取失败：', error);
      return null;
    }
  }

  function deleteSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  function downloadSave(player) {
    const content = JSON.stringify({ game: '霍开然的人生选择', exportedAt: new Date().toISOString(), player }, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `霍开然的人生选择_${player.date.year}-${String(player.date.month).padStart(2, '0')}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function importSave(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('没有选择文件'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ''));
          const rawPlayer = parsed.player || parsed;
          const player = window.LIFE_PLAYER.normalizePlayer(rawPlayer);
          if (!player || !player.name || !player.date) throw new Error('不是有效的游戏存档');
          resolve(player);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  window.LIFE_SAVE = { SAVE_KEY, hasSave, saveGame, loadGame, deleteSave, downloadSave, importSave };
})();
