import { useAppStore } from '@/store/useAppStore';

export function usePermissions() {
  const { user } = useAppStore();
  
  const role = user?.Role || 'Admin'; // Default to Admin for dev/testing if null

  const isAdmin = role === 'Admin';
  const isVanThu = role === 'Văn thư';
  const isLanhDao = role === 'Lãnh đạo';
  const isChuyenVien = role === 'Chuyên viên';

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
