const fs = require('fs');

// 1. Fix api.ts login function
const apiPath = 'src/services/api.ts';
let apiContent = fs.readFileSync(apiPath, 'utf8');

const oldLogin = `login: async (credentials: any) => {
    const users = await getList('users');
    const user = users.find(u => u.username === credentials.username && u.password === credentials.password);
    if (user) {
        return { success: true, user: user };
    }`;

const newLogin = `login: async (credentials: any) => {
    const users = await getList('users');
    const uInput = (credentials.username || '').trim().toLowerCase();
    const pInput = (credentials.password || '').trim();

    const found = users.find((u: any) => {
      const uName = (u.username || u.Username || u['Tên đăng nhập'] || '').trim().toLowerCase();
      const uPass = (u.password || u.Password || u['Mật khẩu'] || '').trim();
      return uName === uInput && uPass === pInput;
    });

    if (found) {
      const role = found.role || found.Role || found['Phân quyền'] || found['Quyền hạn'] || 'Chuyên viên';
      const fullName = found.fullName || found.FullName || found.Full_Name || found['Họ tên cán bộ'] || found['Tên người dùng'] || found.username || found['Tên đăng nhập'] || 'Cán bộ';
      const username = found.username || found.Username || found['Tên đăng nhập'] || uInput;
      const normalized = {
        ...found,
        username,
        Username: username,
        fullName,
        FullName: fullName,
        Full_Name: fullName,
        role,
        Role: role
      };
      return { success: true, user: normalized };
    }`;

if (apiContent.includes('login: async')) {
    apiContent = apiContent.replace(oldLogin, newLogin);
    fs.writeFileSync(apiPath, apiContent, 'utf8');
    console.log('Fixed api.ts login logic');
} else {
    console.log('Could not replace login in api.ts');
}

// 2. Fix usePermissions.ts
const permPath = 'src/hooks/usePermissions.ts';
let permContent = fs.readFileSync(permPath, 'utf8');

permContent = permContent.replace(
    "const role = user?.Role || 'Admin';",
    "const role = user?.Role || user?.role || user?.['Phân quyền'] || user?.['Quyền hạn'] || 'Chuyên viên';"
);
fs.writeFileSync(permPath, permContent, 'utf8');
console.log('Fixed usePermissions.ts');

// 3. Fix Sidebar.tsx
const sidebarPath = 'src/components/Sidebar.tsx';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

const oldSidebarUser = `<p className="text-sm font-medium text-gray-900">{user?.Role || 'Admin'}</p>
            <p className="text-xs text-gray-500">{user?.FullName || user?.Username || 'Người dùng'}</p>`;

const newSidebarUser = `<p className="text-sm font-bold text-gray-900">{user?.FullName || user?.['Họ tên cán bộ'] || user?.Username || 'Người dùng'}</p>
            <p className="text-xs text-gray-500 font-medium">{user?.Role || user?.['Phân quyền'] || 'Chuyên viên'}</p>`;

sidebarContent = sidebarContent.replace(oldSidebarUser, newSidebarUser);
fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');
console.log('Fixed Sidebar.tsx');

// 4. Fix Topbar.tsx
const topbarPath = 'src/components/Topbar.tsx';
let topbarContent = fs.readFileSync(topbarPath, 'utf8');

const oldTopbarUser = `<p className="text-sm font-bold text-gray-900">{user?.Username || 'Người dùng'}</p>
            <p className="text-xs text-gray-500">{user?.Role || 'Role'}</p>`;

const newTopbarUser = `<p className="text-sm font-bold text-gray-900">{user?.FullName || user?.['Họ tên cán bộ'] || user?.Username || 'Người dùng'}</p>
            <p className="text-xs text-gray-500 font-medium">{user?.Role || user?.['Phân quyền'] || 'Chuyên viên'}</p>`;

topbarContent = topbarContent.replace(oldTopbarUser, newTopbarUser);
fs.writeFileSync(topbarPath, topbarContent, 'utf8');
console.log('Fixed Topbar.tsx');

// 5. Fix useAppStore.ts normalize setUser
const storePath = 'src/store/useAppStore.ts';
let storeContent = fs.readFileSync(storePath, 'utf8');

const oldSetUser = `setUser: (user) => set({ user }),`;
const newSetUser = `setUser: (user) => {
    if (!user) return set({ user: null });
    const role = user.role || user.Role || user['Phân quyền'] || user['Quyền hạn'] || 'Chuyên viên';
    const fullName = user.fullName || user.FullName || user.Full_Name || user['Họ tên cán bộ'] || user['Tên người dùng'] || user.username || user['Tên đăng nhập'] || 'Người dùng';
    const username = user.username || user.Username || user['Tên đăng nhập'] || '';
    const normalized = {
      ...user,
      username,
      Username: username,
      fullName,
      FullName: fullName,
      Full_Name: fullName,
      role,
      Role: role
    };
    set({ user: normalized });
  },`;

storeContent = storeContent.replace(oldSetUser, newSetUser);
fs.writeFileSync(storePath, storeContent, 'utf8');
console.log('Fixed useAppStore.ts setUser');
