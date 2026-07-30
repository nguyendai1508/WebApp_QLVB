import { useAppStore } from '@/store/useAppStore';

export function usePermissions() {
  const { user } = useAppStore();
  
  const role = user?.Role || user?.role || user?.['Phân quyền'] || user?.['Quyền hạn'] || 'Chuyên viên'; // Default to Admin for dev/testing if null

  const roleName = (role || 'Chuyên viên').toString().toLowerCase().trim();

  const isAdmin = roleName === 'admin' || roleName === 'quản trị viên';
  const isVanThu = roleName === 'văn thư';
  const isLanhDao = roleName === 'lãnh đạo';
  const isChuyenVien = roleName === 'chuyên viên' || roleName === 'nghiệp vụ';

  return {
    isAdmin,
    isVanThu,
    isLanhDao,
    isChuyenVien,
    canManageCatalogs: isAdmin || isLanhDao,
    canManageStaff: isAdmin || isLanhDao,
    canManageUsers: isAdmin,
    canAddIncoming: isAdmin || isVanThu || isLanhDao,
    canAddOutgoing: isAdmin || isVanThu || isChuyenVien || isLanhDao,
    canAddTask: isAdmin || isLanhDao || isVanThu,
    canEditDoc: isAdmin || isVanThu || isLanhDao,
    canDelete: isAdmin
  };
}
