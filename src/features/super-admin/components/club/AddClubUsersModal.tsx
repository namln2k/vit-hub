import { addUsersToClub } from '@/services/clubs';
import AddUsersModal from '@/features/super-admin/components/common/AddUsersModal';
import { useAddUsersModal } from '@/features/super-admin/hooks/useAddUsersModal';

interface AddClubUsersModalProps {
  clubId: string;
  clubName: string;
  existingUserIds: string[];
  onClose: () => void;
  onAdded: () => Promise<void>;
}

export default function AddClubUsersModal({
  clubId,
  clubName,
  existingUserIds,
  onClose,
  onAdded,
}: AddClubUsersModalProps) {
  const modalState = useAddUsersModal({
    existingUserIds,
    entityLabel: 'CLB/tổ',
    successToastId: 'club-add-users-success',
    errorToastId: 'club-add-users-error',
    onAddUsers: (userIds, startsAt) => addUsersToClub(clubId, userIds, startsAt),
    onAdded,
    onClose,
  });

  return (
    <AddUsersModal
      {...modalState}
      entityId="club"
      entityLabel="CLB/tổ"
      entityName={clubName}
      onClose={onClose}
      onEmailListValueChange={modalState.updateEmailListValue}
      onImportEmails={modalState.importEmails}
      onRemoveSelectedUser={modalState.removeSelectedUser}
      onSearchValueChange={modalState.setSearchValue}
      onSelectUser={modalState.selectUser}
      onStartsAtValueChange={modalState.setStartsAtValue}
      onSubmit={modalState.submit}
    />
  );
}
