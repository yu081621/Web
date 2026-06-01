// 简单前端逻辑：加载资料、头像预览、提交更新
document.addEventListener('DOMContentLoaded', () => {
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const liveAvatar = document.getElementById('liveAvatar');
  const displayName = document.getElementById('displayName');
  const username = document.getElementById('username');
  const bio = document.getElementById('bio');
  const website = document.getElementById('website');
  const profileForm = document.getElementById('profileForm');
  const removeAvatarBtn = document.getElementById('removeAvatar');
  const liveDisplayName = document.getElementById('liveDisplayName');
  const liveUsername = document.getElementById('liveUsername');
  const liveBio = document.getElementById('liveBio');

  let avatarFile = null;
  let removeAvatar = false;
  const DEFAULT_AVATAR = avatarPreview.src;

  // 加载当前用户资料
  async function loadProfile() {
    try {
      const resp = await fetch('/api/profile', { credentials: 'include' });
      if (!resp.ok) return;
      const data = await resp.json();
      displayName.value = data.display_name || '';
      username.value = data.username || '';
      bio.value = data.bio || '';
      website.value = data.website || '';
      const avatarUrl = data.avatar_url || DEFAULT_AVATAR;
      avatarPreview.src = avatarUrl;
      liveAvatar.src = avatarUrl;
      updateLive();
    } catch (e) {
      console.error('加载资料失败', e);
    }
  }

  function updateLive() {
    liveDisplayName.textContent = displayName.value.trim() || '未设置';
    liveUsername.textContent = username.value ? `@${username.value}` : '@username';
    liveBio.textContent = bio.value.trim() || '个人简介将显示在这里。';
  }

  // 文件选择与预览
  avatarInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) {
      window.utils?.showToast?.('不支持的图片格式', 'error') || alert('不支持的图片格式');
      avatarInput.value = '';
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      window.utils?.showToast?.('图片过大（>2MB）', 'error') || alert('图片过大（>2MB）');
      avatarInput.value = '';
      return;
    }
    avatarFile = f;
    removeAvatar = false;
    const url = URL.createObjectURL(f);
    avatarPreview.src = url;
    liveAvatar.src = url;
  });

  // 移除头像（恢复默认）
  removeAvatarBtn.addEventListener('click', () => {
    avatarFile = null;
    removeAvatar = true;
    avatarInput.value = '';
    avatarPreview.src = DEFAULT_AVATAR;
    liveAvatar.src = DEFAULT_AVATAR;
  });

  // 实时预览文本变更
  [displayName, username, bio].forEach(el => {
    el.addEventListener('input', updateLive);
  });

  // 提交表单
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dn = displayName.value.trim();
    if (!dn) {
      window.utils?.showToast?.('显示名不能为空', 'error') || alert('显示名不能为空');
      return;
    }

    try {
      let resp;
      if (avatarFile || removeAvatar) {
        const fd = new FormData();
        if (avatarFile) fd.append('avatar', avatarFile);
        if (removeAvatar) fd.append('remove_avatar', '1');
        fd.append('display_name', dn);
        fd.append('username', username.value.trim());
        fd.append('bio', bio.value.trim());
        fd.append('website', website.value.trim());

        resp = await fetch('/api/profile', {
          method: 'PUT',
          credentials: 'include',
          body: fd
        });
      } else {
        resp = await fetch('/api/profile', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: dn,
            username: username.value.trim(),
            bio: bio.value.trim(),
            website: website.value.trim()
          })
        });
      }

      if (resp.ok) {
        const data = await resp.json();
        window.utils?.showToast?.('保存成功', 'success') || alert('保存成功');
        // 更新页面预览与头像（若后端返回 avatar_url）
        if (data.avatar_url) {
          avatarPreview.src = data.avatar_url;
          liveAvatar.src = data.avatar_url;
        }
        removeAvatar = false;
        avatarFile = null;
      } else {
        const text = await resp.text();
        window.utils?.showToast?.(`保存失败：${text}`, 'error') || alert('保存失败：' + text);
      }
    } catch (err) {
      console.error(err);
      window.utils?.showToast?.('网络或服务器错误', 'error') || alert('网络或服务器错误');
    }
  });

  // 取消按钮（返回上一页）
  document.getElementById('cancelBtn').addEventListener('click', () => window.history.back());

  loadProfile();
});
