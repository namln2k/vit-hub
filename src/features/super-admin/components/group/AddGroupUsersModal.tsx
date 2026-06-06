import AddUsersModal from '@/features/super-admin/components/common/AddUsersModal';
import { useAddUsersModal } from '@/features/super-admin/hooks/useAddUsersModal';
import { addUsersToGroup } from '@/services/groups';

interface AddGroupUsersModalProps {
  groupId: string;
  groupName: string;
  existingUserIds: string[];
  onClose: () => void;
  onAdded: () => Promise<void>;
}

export default function AddGroupUsersModal({
  groupId,
  groupName,
  existingUserIds,
  onClose,
  onAdded,
}: AddGroupUsersModalProps) {
  const modal = useAddUsersModal({
    existingUserIds,
    entityLabel: 'nhóm',
    successToastId: 'group-add-users-success',
    errorToastId: 'group-add-users-error',
    onAddUsers: (userIds) => addUsersToGroup(groupId, userIds),
    onAdded,
    onClose,
  });

  return (
    <AddUsersModal
      entityId="group"
      entityLabel="nhóm"
      entityName={groupName}
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
      onClose={onClose}
      onEmailListValueChange={modal.updateEmailListValue}
      onImportEmails={modal.importEmails}
      onRemoveSelectedUser={modal.removeSelectedUser}
      onSearchValueChange={modal.setSearchValue}
      onSelectUser={modal.selectUser}
      onSubmit={modal.submit}
    />
  );
}
