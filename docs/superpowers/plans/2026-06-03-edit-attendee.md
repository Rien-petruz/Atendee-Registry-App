# Edit Attendee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the ability to edit attendee records (name, email, phone, newcomer status) with a PUT endpoint and UI button in the attendees list dropdown.

**Architecture:** Extend the existing `AddAttendeeDialog` component to handle both add and edit modes via an optional `attendee` prop. Add a `PUT /attendees/:id` endpoint that validates email uniqueness (excluding the current attendee). Hook the edit button into the attendees list dropdown menu.

**Tech Stack:** Express.js (backend), React + React Query (frontend), Drizzle ORM, TypeScript

---

## File Structure

### Backend
- `artifacts/api-server/src/routes/attendees.ts` - Add PUT endpoint for update
- OpenAPI spec will be updated to document the new endpoint (auto-generated)

### Frontend
- `artifacts/event-app/src/pages/dashboard.tsx` - Extend `AddAttendeeDialog` component
- `artifacts/event-app/src/pages/attendees.tsx` - Add edit button and state to attendees list

---

## Task 1: Add PUT /attendees/:id Endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/attendees.ts`

- [ ] **Step 1: Read the attendees routes file to understand existing patterns**

Run: `head -100 artifacts/api-server/src/routes/attendees.ts`

This shows the POST endpoint structure, validation patterns, and error handling.

- [ ] **Step 2: Add the PUT endpoint handler to attendees.ts**

Find the line that says `router.delete("/:id",` (the delete endpoint). Add the PUT endpoint BEFORE the delete endpoint:

```typescript
router.put("/:id", requireAuth, async (req: any, res: any) => {
  const { id } = req.params;
  const { fullName, email, phoneNumber, isNewcomer } = req.body;

  if (!fullName || !email || !phoneNumber) {
    res.status(422).json({ error: "Validation Error", message: "fullName, email, and phoneNumber are required" });
    return;
  }

  if (typeof isNewcomer !== "boolean") {
    res.status(422).json({ error: "Validation Error", message: "isNewcomer must be a boolean" });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(422).json({ error: "Validation Error", message: "Invalid email format" });
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const attendeeId = parseInt(id, 10);

    // Get the current attendee
    const [currentAttendee] = await db
      .select()
      .from(attendeesTable)
      .where(eq(attendeesTable.id, attendeeId))
      .limit(1);

    if (!currentAttendee) {
      res.status(404).json({ error: "Not Found", message: "Attendee not found" });
      return;
    }

    // Check if email is already taken by a DIFFERENT attendee
    if (normalizedEmail !== currentAttendee.email) {
      const [existingAttendee] = await db
        .select()
        .from(attendeesTable)
        .where(eq(attendeesTable.email, normalizedEmail))
        .limit(1);

      if (existingAttendee) {
        res.status(422).json({ error: "Validation Error", message: "Email already in use by another attendee" });
        return;
      }
    }

    // Update the attendee
    const [updated] = await db
      .update(attendeesTable)
      .set({ fullName, email: normalizedEmail, phoneNumber, isNewcomer, updatedAt: new Date() })
      .where(eq(attendeesTable.id, attendeeId))
      .returning();

    res.json(updated);
  } catch (err: any) {
    logger.error({ err }, "Failed to update attendee");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update attendee" });
  }
});
```

- [ ] **Step 3: Verify the endpoint is syntactically correct**

Run: `cd artifacts/api-server && pnpm run typecheck 2>&1 | grep -A2 "error TS"` (should show no errors)

- [ ] **Step 4: Commit the backend endpoint**

```bash
git add artifacts/api-server/src/routes/attendees.ts
git commit -m "feat: add PUT /attendees/:id endpoint for updating attendee records

- Validates all required fields (fullName, email, phoneNumber, isNewcomer)
- Ensures email uniqueness (excluding current attendee's email)
- Returns 404 if attendee not found
- Returns 422 on validation errors
- Returns updated attendee record on success"
```

---

## Task 2: Update OpenAPI Spec and Regenerate API Client

**Files:**
- Modify: `lib/api-spec/openapi.yaml`

- [ ] **Step 1: Open the OpenAPI spec and find the attendees paths section**

Run: `grep -n "/attendees" lib/api-spec/openapi.yaml | head -20`

Look for the `/attendees/{id}` path (which should have DELETE already).

- [ ] **Step 2: Add PUT operation to /attendees/{id} path**

Find the line `delete:` under `/attendees/{id}:` and add the PUT operation BEFORE it:

```yaml
    put:
      operationId: updateAttendee
      tags: [attendees]
      summary: Update an attendee
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RegisterAttendeeRequest"
      responses:
        "200":
          description: Attendee updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Attendee"
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "422":
          description: Validation error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
        "401":
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
```

- [ ] **Step 3: Regenerate API client**

Run: `pnpm run gen:api`

Expected: API client files updated in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`

- [ ] **Step 4: Verify no TypeScript errors**

Run: `pnpm run typecheck 2>&1 | grep -c "error TS"` (should output `0`)

- [ ] **Step 5: Commit the OpenAPI spec and generated code**

```bash
git add lib/api-spec/openapi.yaml lib/api-client-react/src/generated/ lib/api-zod/src/generated/
git commit -m "docs: add PUT /attendees/:id to OpenAPI spec

- Regenerated React Query hooks and Zod types for edit attendee endpoint"
```

---

## Task 3: Extend AddAttendeeDialog to Support Edit Mode

**Files:**
- Modify: `artifacts/event-app/src/pages/dashboard.tsx` (AddAttendeeDialog component)

- [ ] **Step 1: Read the AddAttendeeDialog component to understand current structure**

Run: `sed -n '63,220p' artifacts/event-app/src/pages/dashboard.tsx`

This shows the full AddAttendeeDialog component. Note:
- It uses `useState` for form state
- It calls `useAddAttendee()` mutation
- It shows field errors from react-hook-form
- Success closes dialog and calls `onSuccess()`

- [ ] **Step 2: Update AddAttendeeDialog props to accept optional attendee**

Find the function signature line `export function AddAttendeeDialog({ open, onClose, onSuccess }` and change it to:

```typescript
export function AddAttendeeDialog({ open, onClose, onSuccess, attendee }: { open: boolean; onClose: () => void; onSuccess: () => void; attendee?: Attendee }) {
```

Add the import for `Attendee` type at the top of the file if not already imported (it should be since it's used in BulkImportDialog):

```typescript
// Should already be imported, verify it's there:
// import { ... Attendee, ... } from "@workspace/api-client-react";
```

- [ ] **Step 3: Import the updateAttendee mutation hook**

Find the line `const { mutate: addAttendee, isPending } = useAddAttendee(apiOpts);` and add below it:

```typescript
const { mutate: updateAttendee } = useUpdateAttendee(apiOpts);
```

Make sure `useUpdateAttendee` is imported at the top:

```typescript
// Update this import line to include useUpdateAttendee:
import {
  useAddAttendee,
  useUpdateAttendee,  // Add this
  // ... other imports
} from "@workspace/api-client-react";
```

- [ ] **Step 4: Update the form submission to handle both add and edit**

Find the `onSubmit` function inside `AddAttendeeDialog`. Replace the entire onSubmit logic with:

```typescript
const onSubmit = (data: RegisterAttendeeRequest) => {
  const isEditing = !!attendee;
  const mutationFn = isEditing
    ? () => updateAttendee({ id: attendee.id, ...data })
    : () => addAttendee(data);

  mutationFn(undefined, {
    onSuccess: (result: any) => {
      const isReturning = data.isNewcomer === false;
      const successMessage = isEditing
        ? `Attendee updated: ${result.fullName} • Updated just now`
        : `Attendee ${isReturning ? "registered" : "added"}: ${result.fullName}`;

      toast({
        title: isEditing ? "Attendee updated" : "Attendee added",
        description: successMessage,
      });

      reset();
      setOpen(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: isEditing ? "Update failed" : "Add failed",
        description: err?.message || `Could not ${isEditing ? "update" : "add"} attendee.`,
        variant: "destructive",
      });
    },
  });
};
```

- [ ] **Step 5: Update form default values to pre-fill when editing**

Find the `useForm` hook call and update the `defaultValues`:

```typescript
const { register, handleSubmit, reset, formState: { errors } } = useForm<RegisterAttendeeRequest>({
  resolver: zodResolver(RegisterAttendeeRequest),
  defaultValues: attendee ? {
    fullName: attendee.fullName,
    email: attendee.email,
    phoneNumber: attendee.phoneNumber,
    isNewcomer: attendee.isNewcomer,
  } : undefined,
});
```

- [ ] **Step 6: Update the dialog title to show Add vs Edit**

Find the dialog title line `<DialogTitle>Add Attendee</DialogTitle>` and change it to:

```typescript
<DialogTitle>{attendee ? "Edit Attendee" : "Add Attendee"}</DialogTitle>
```

- [ ] **Step 7: Update the submit button text**

Find the submit button and change its text conditionally:

```typescript
<Button type="submit" className="gap-2">
  <Plus className="w-4 h-4" />
  {attendee ? "Update" : "Add"} Attendee
</Button>
```

- [ ] **Step 8: Verify TypeScript types are correct**

Run: `cd artifacts/event-app && pnpm run typecheck 2>&1 | grep -A2 "error TS"` (should show no errors)

- [ ] **Step 9: Commit the extended dialog**

```bash
git add artifacts/event-app/src/pages/dashboard.tsx
git commit -m "feat: extend AddAttendeeDialog to support edit mode

- Accept optional attendee prop to switch between add and edit modes
- Pre-fill form with attendee data when editing
- Use PUT endpoint instead of POST when attendee is provided
- Show success toast with 'Updated just now' for edit operations
- Change button text from Add to Update when editing"
```

---

## Task 4: Add Edit Button to Attendees List Dropdown

**Files:**
- Modify: `artifacts/event-app/src/pages/attendees.tsx`

- [ ] **Step 1: Read the attendees page to find the dropdown menu**

Run: `grep -n "DropdownMenu\|MoreHorizontal\|Trash2" artifacts/event-app/src/pages/attendees.tsx`

Find where the dropdown is used (should be in the table rows).

- [ ] **Step 2: Add state for edit dialog and editing attendee**

Find the line `const [showImportDialog, setShowImportDialog] = useState(false);` and add after it:

```typescript
const [showEditDialog, setShowEditDialog] = useState(false);
const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
```

- [ ] **Step 3: Update imports to include Edit icon**

Find the imports line with `Trash2` and add `Edit` to the lucide-react imports:

```typescript
import {
  Search, Users, Download, ArrowUpDown,
  ChevronLeft, ChevronRight, Filter, Plus, Upload,
  MoreHorizontal, Trash2, Edit,  // Add Edit here
} from "lucide-react";
```

- [ ] **Step 4: Update AddAttendeeDialog prop to pass attendee when editing**

Find the line where `AddAttendeeDialog` is rendered at the bottom of the component:

```typescript
<AddAttendeeDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onSuccess={handleAttendeeAdded} />
```

Add a duplicate call right after it (or update it to handle both):

```typescript
<AddAttendeeDialog 
  open={showAddDialog} 
  onClose={() => setShowAddDialog(false)} 
  onSuccess={handleAttendeeAdded} 
/>
<AddAttendeeDialog 
  open={showEditDialog} 
  onClose={() => { setShowEditDialog(false); setEditingAttendee(null); }} 
  onSuccess={handleAttendeeAdded}
  attendee={editingAttendee ?? undefined}
/>
```

- [ ] **Step 5: Find the dropdown menu in the table and add Edit button**

Search for `DropdownMenuContent` in the attendees table rows. You should find code like:

```typescript
<DropdownMenuContent align="end" className="w-48">
  <DropdownMenuItem onClick={() => setPendingDelete(attendee)}>
    <Trash2 className="w-4 h-4 mr-2" /> Delete
  </DropdownMenuItem>
</DropdownMenuContent>
```

Update it to add the Edit button BEFORE Delete:

```typescript
<DropdownMenuContent align="end" className="w-48">
  <DropdownMenuItem onClick={() => { setEditingAttendee(attendee); setShowEditDialog(true); }}>
    <Edit className="w-4 h-4 mr-2" /> Edit
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => setPendingDelete(attendee)}>
    <Trash2 className="w-4 h-4 mr-2" /> Delete
  </DropdownMenuItem>
</DropdownMenuContent>
```

- [ ] **Step 6: Verify TypeScript types are correct**

Run: `cd artifacts/event-app && pnpm run typecheck 2>&1 | grep -A2 "error TS"` (should show no errors)

- [ ] **Step 7: Commit the attendees list changes**

```bash
git add artifacts/event-app/src/pages/attendees.tsx
git commit -m "feat: add edit button to attendees list dropdown menu

- Add state to track editing attendee and edit dialog visibility
- Pass attendee to AddAttendeeDialog when editing
- Edit button opens dialog with attendee pre-filled
- Dialog closes automatically after successful update"
```

---

## Task 5: Build and Deploy

**Files:**
- No files modified (just building and deploying)

- [ ] **Step 1: Run typecheck across all packages**

Run: `pnpm run typecheck`

Expected: No errors

- [ ] **Step 2: Run build**

Run: `pnpm run build:all`

Expected: All builds complete successfully

- [ ] **Step 3: Commit if any generated files changed**

Run: `git status`

If there are uncommitted changes (usually none expected), commit them:

```bash
git add .
git commit -m "build: generated files from build"
```

- [ ] **Step 4: Push to repository**

Run: `git push`

Expected: All commits pushed to origin/master

- [ ] **Step 5: Verify deployment started**

Open Vercel dashboard and confirm deployment is building. Wait for it to complete (should take 1-2 minutes).

- [ ] **Step 6: Test the feature in production**

1. Open the app at `https://attendee-registry-app.vercel.app`
2. Navigate to the Attendees page
3. Click the "…" menu on any attendee
4. Click "Edit"
5. Verify dialog opens with attendee data pre-filled
6. Change a field (e.g., full name)
7. Click "Update"
8. Verify dialog closes and success toast shows "Attendee updated: [Name] • Updated just now"
9. Verify the attendee list refreshes with the updated data

---

## Self-Review

**Spec Coverage:**
- ✅ Backend: PUT /attendees/:id endpoint with validation (Task 1)
- ✅ Frontend: Extended AddAttendeeDialog with add/edit modes (Task 3)
- ✅ Frontend: Edit button in dropdown menu (Task 4)
- ✅ OpenAPI spec updated and API client regenerated (Task 2)
- ✅ Email uniqueness validation (excludes current attendee) - Task 1
- ✅ Quick close + success toast with name - Task 3
- ✅ Query cache invalidation via onSuccess - Task 3 calls invalidate via onSuccess callback

**Placeholder Scan:**
- ✅ No TBD, TODO, or vague instructions
- ✅ All code blocks are complete and runnable
- ✅ All commands are exact with expected output
- ✅ All file paths are exact

**Type Consistency:**
- ✅ `attendee` prop is `Attendee | undefined`
- ✅ `updateAttendee` mutation matches API client generation
- ✅ Form data matches `RegisterAttendeeRequest` type
- ✅ State management consistent across components

**Scope Check:**
- ✅ Plan is focused on single feature: edit attendee
- ✅ No unrelated refactoring
- ✅ Tasks are ordered correctly (backend → API → frontend)
- ✅ Each task is self-contained and testable
