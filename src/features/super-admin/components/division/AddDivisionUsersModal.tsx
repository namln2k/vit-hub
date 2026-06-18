import AddUsersModal from '@/features/super-admin/components/common/AddUsersModal';
import { useAddUsersModal } from '@/features/super-admin/hooks/useAddUsersModal';
import { addUsersToDivision } from '@/services/divisions';

interface AddDivisionUsersModalProps {
  divisionId: string;
  divisionName: string;
  existingUserIds: string[];
  onClose: () => void;
  onAdded: () => Promise<void>;
}

export default function AddDivisionUsersModal({
  divisionId,
  divisionName,
  existingUserIds,
  onClose,
  onAdded,
}: AddDivisionUsersModalProps) {
  const modal = useAddUsersModal({
    existingUserIds,
    entityLabel: 'mảng',
    successToastId: 'division-add-users-success',
    errorToastId: 'division-add-users-error',
    onAddUsers: (userIds, startsAt) => addUsersToDivision(divisionId, userIds, startsAt),
    onAdded,
    onClose,
  });

  return (
    <AddUsersModal
      entityId="division"
      entityLabel="mảng"
      entityName={divisionName}
      availableUsers={modal.availableUsers}
      emailImportError={modal.emailImportError}
      emailImportMessage={modal.emailImportMessage}
      emailListValue={modal.emailListValue}
      isAdding={modal.isAdding}
      isImportingEmails={modal.isImportingEmails}
      isSearching={modal.isSearching}
      queryText={modal.queryText}
      searchError={modal.searchError}
      searchValue={modal.searchValue}
      selectedUsers={modal.selectedUsers}
      startsAtValue={modal.startsAtValue}
      onClose={onClose}
      onEmailListValueChange={modal.updateEmailListValue}
      onImportEmails={modal.importEmails}
      onRemoveSelectedUser={modal.removeSelectedUser}
      onSearchValueChange={modal.setSearchValue}
      onSelectUser={modal.selectUser}
      onStartsAtValueChange={modal.setStartsAtValue}
      onSubmit={modal.submit}
    />
  );
}
