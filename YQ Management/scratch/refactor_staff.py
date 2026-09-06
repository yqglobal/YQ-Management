import os
import re

# Refactor staff.tsx to only contain "Members" tab and remove "Providers" logic
staff_path = "/home/abhimanyu/Projects/YQ/YQ Management/frontend/src/pages/dashboard/settings/_components/staff.tsx"
with open(staff_path, "r") as f:
    content = f.read()

# 1. Remove Provider and related states/queries
content = re.sub(r'const \[isProviderModalOpen, setIsProviderModalOpen\] = useState\(false\);\n', '', content)
content = re.sub(r'const \[editingProvider, setEditingProvider\] = useState<Provider \| null>\(null\);\n', '', content)
content = re.sub(r"const \{ data: providers = \[\], isLoading: isProvidersLoading \} = useQuery.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const deleteProviderMutation = useMutation.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const toggleProviderStatus = useMutation.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"type Provider = \{.*?\}\;\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"function ProviderAvatar.*?\}\n\n", '', content, flags=re.DOTALL)

# 2. Remove Provider tab UI and Tab navigation entirely, just keep the members list
# We can just remove the tabs and replace {activeTab === 'members' && ( with nothing
content = re.sub(r"const \[activeTab, setActiveTab\] = useState<'members' \| 'providers'>\('members'\);\n", '', content)
# Tab navigation HTML removal
content = re.sub(r"\{/\* Tab navigation \*/\}.*?\{/\* MEMBERS TAB \*/\}", "{/* MEMBERS SECTION */}", content, flags=re.DOTALL)
content = re.sub(r"\{activeTab === 'members' && \(\n\s*", "", content)
# And we need to remove the whole Provider Tab HTML block
content = re.sub(r"\{/\* PROVIDERS TAB \*/\}.*?\{activeTab === 'providers' && \(.*?\)\}\n\n", "", content, flags=re.DOTALL)

# Close the trailing div correctly if we removed the condition
# actually let's just replace the `{activeTab === 'members' && (` line and then at the very bottom replace `)}\n    </div>` with `</div>`
content = re.sub(r"\)\}\n\n      \{isInviteModalOpen", "\n      {isInviteModalOpen", content)

# Remove ProviderModal from imports and render
content = re.sub(r"import \{ ProviderModal \} from '../../../../components/modals/ProviderModal';\n", '', content)
content = re.sub(r"\{isProviderModalOpen && \(.*?ProviderModal.*?\}\n", '', content, flags=re.DOTALL)

with open(staff_path, "w") as f:
    f.write(content)

# Refactor providers.tsx to only contain "Providers" tab and remove "Members" logic
providers_path = "/home/abhimanyu/Projects/YQ/YQ Management/frontend/src/pages/dashboard/settings/_components/providers.tsx"
with open(providers_path, "r") as f:
    content = f.read()

# 1. Remove Member and related states/queries
content = re.sub(r"import \{ InviteMemberModal \} from '../../../../components/modals/InviteMemberModal';\n", '', content)
content = re.sub(r"import \{ UserPermissionsModal \} from '../../../../components/modals/UserPermissionsModal';\n", '', content)
content = re.sub(r"type Member = \{.*?\}\;\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const ROLE_LABELS.*?\}\;\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const STATUS_CONFIG.*?\}\;\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"function RoleBadge.*?\}\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"function StatusBadge.*?\}\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"function MemberAvatar.*?\}\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"function MemberRowMenu.*?\}\n\n", '', content, flags=re.DOTALL)

content = re.sub(r"const \[isInviteModalOpen, setIsInviteModalOpen\] = useState\(false\);\n", '', content)
content = re.sub(r"const \[permissionsModalOpen, setPermissionsModalOpen\] = useState\(false\);\n", '', content)
content = re.sub(r"const \[userToEdit, setUserToEdit\] = useState<any>\(null\);\n", '', content)
content = re.sub(r"const \{ data: members = \[\], isLoading \} = useQuery.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const deleteMember = useMutation.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const resendMutation = useMutation.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const updateRoleMutation = useMutation.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const transferOwnershipMutation = useMutation.*?\}\);\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const handleRoleChange = .*?\}\;\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const handleTransferOwnership = .*?\}\;\n\n", '', content, flags=re.DOTALL)
content = re.sub(r"const activeMembers = .*?\n", '', content)
content = re.sub(r"const invitedMembers = .*?\n", '', content)
content = re.sub(r"const myOwnership = .*?\n", '', content)

# 2. Remove Member tab UI and Tab navigation
content = re.sub(r"const \[activeTab, setActiveTab\] = useState<'members' \| 'providers'>\('members'\);\n", '', content)
content = re.sub(r"export default function StaffDirectory\(\) \{", 'export default function ProvidersSettings() {', content)

# Remove tabs and members HTML
content = re.sub(r"\{/\* Tab navigation \*/\}.*?\{/\* MEMBERS TAB \*/\}", "{/* PROVIDERS SECTION */}", content, flags=re.DOTALL)
content = re.sub(r"\{activeTab === 'members' && \(.*?\{/\* PROVIDERS TAB \*/\}", "{/* PROVIDERS TAB */}", content, flags=re.DOTALL)
content = re.sub(r"\{activeTab === 'providers' && \(\n\s*", "", content)

# Remove trailing } from activeTab condition
content = re.sub(r"\)\}\n\n      \{isInviteModalOpen", "\n      {isProviderModalOpen", content, flags=re.DOTALL)

# Remove Member modals
content = re.sub(r"\{isInviteModalOpen && \(.*?InviteMemberModal.*?\}\n", '', content, flags=re.DOTALL)
content = re.sub(r"\{permissionsModalOpen && userToEdit && \(.*?UserPermissionsModal.*?\}\n", '', content, flags=re.DOTALL)


with open(providers_path, "w") as f:
    f.write(content)
