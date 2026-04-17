import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserPlus, Pencil, Trash2, Users, GraduationCap, BookOpen, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge variant="default" className="text-[10px]">Admin</Badge>;
    case "teacher":
      return <Badge variant="secondary" className="text-[10px]">Teacher</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">Student</Badge>;
  }
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "student",
  });

  const [editData, setEditData] = useState({
    name: "",
    email: "",
    role: "student",
  });

  const roleFilter = activeTab === "all" ? "all" : activeTab;
  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users", `?role=${roleFilter}`],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreateOpen(false);
      setFormData({ username: "", password: "", name: "", email: "", role: "student" });
      toast({ title: "User created", description: "New user has been created successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: { id: string; updates: typeof editData }) =>
      apiRequest("PATCH", `/api/admin/users/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditOpen(false);
      setSelectedUser(null);
      toast({ title: "User updated", description: "User has been updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteOpen(false);
      setSelectedUser(null);
      toast({ title: "User deleted", description: "User has been removed from the platform." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredUsers = users.filter((u: any) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setEditData({ name: user.name, email: user.email, role: user.role });
    setEditOpen(true);
  };

  const handleDelete = (user: any) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create, edit, and manage platform users"
        actions={
          <Button data-testid="button-create-user" onClick={() => setCreateOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-users"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger data-testid="tab-all" value="all">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              All
            </TabsTrigger>
            <TabsTrigger data-testid="tab-student" value="student">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              Students
            </TabsTrigger>
            <TabsTrigger data-testid="tab-teacher" value="teacher">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Teachers
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-md" />
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery ? "Try a different search term" : "Create a new user to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>XP / Level</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((u: any) => (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium" data-testid={`text-username-${u.id}`}>{u.name}</p>
                                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground" data-testid={`text-email-${u.id}`}>{u.email}</span>
                            </TableCell>
                            <TableCell data-testid={`text-role-${u.id}`}>
                              {getRoleBadge(u.role)}
                            </TableCell>
                            <TableCell>
                              {u.role === "student" ? (
                                <span className="text-sm font-mono" data-testid={`text-xp-${u.id}`}>
                                  {u.xp} XP · Lv.{u.level}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {u.createdAt ? formatDistanceToNow(new Date(u.createdAt), { addSuffix: true }) : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  data-testid={`button-edit-user-${u.id}`}
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEdit(u)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  data-testid={`button-delete-user-${u.id}`}
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete(u)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new student, teacher, or admin to the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-username">Username</Label>
              <Input
                data-testid="input-create-username"
                id="create-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. awaissabir"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                data-testid="input-create-name"
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Awais Sabir"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                data-testid="input-create-email"
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. awais@university.edu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                data-testid="input-create-password"
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              data-testid="button-submit-create"
              onClick={() => createMutation.mutate(formData)}
              disabled={createMutation.isPending || !formData.username || !formData.name || !formData.email || !formData.password}
            >
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details for {selectedUser?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                data-testid="input-edit-name"
                id="edit-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                data-testid="input-edit-email"
                id="edit-email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editData.role}
                onValueChange={(val) => setEditData({ ...editData, role: val })}
              >
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              data-testid="button-submit-edit"
              onClick={() => selectedUser && editMutation.mutate({ id: selectedUser.id, updates: editData })}
              disabled={editMutation.isPending || !editData.name || !editData.email}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
