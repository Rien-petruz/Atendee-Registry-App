# Edit Attendee Feature Design

**Date:** 2026-06-03  
**Status:** Design Approved  
**Scope:** Add the ability to edit attendee records to correct mistakes

## Overview

Users should be able to edit attendee information (name, email, phone, newcomer status) directly from the attendees list. The feature reuses the existing `AddAttendeeDialog` component extended to support both add and edit modes, providing a consistent user experience.

## Motivation

- Users make mistakes when entering attendee data (typos, wrong phone numbers, etc.)
- Currently, the only workaround is to delete and re-add the attendee
- Edit functionality improves data quality and user efficiency

## User Flow

1. User views the attendees list
2. User clicks the "…" (more actions) menu on an attendee row
3. User selects "Edit" from the dropdown
4. Edit dialog opens with attendee fields pre-filled
5. User modifies the desired fields
6. User clicks "Save"
7. Dialog closes automatically
8. Success toast appears: "Attendee updated: [Name] • Updated just now"

## Architecture

### Backend: `PUT /attendees/:id`

**Endpoint:** `PUT /api/attendees/:id`

**Request Body:**
```json
{
  "fullName": "string (required)",
  "email": "string (required)",
  "phoneNumber": "string (required)",
  "isNewcomer": "boolean (required)"
}
```

**Validation:**
- All fields required
- Email must be valid format
- Email must be unique across all attendees (excluding the attendee being edited)
- Return 404 if attendee not found
- Return 422 if validation fails
- Return 500 if update fails

**Response (200 OK):**
```json
{
  "id": "number",
  "fullName": "string",
  "email": "string",
  "phoneNumber": "string",
  "isNewcomer": "boolean",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

### Frontend: Extended `AddAttendeeDialog`

**Props:**
```typescript
interface AddAttendeeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  attendee?: Attendee;  // Optional: if provided, dialog is in edit mode
}
```

**Behavior:**
- **Add mode** (no `attendee` prop):
  - Title: "Add Attendee"
  - Form fields empty
  - Call POST `/attendees`
  - Current behavior unchanged

- **Edit mode** (`attendee` prop provided):
  - Title: "Edit Attendee"
  - Pre-fill all form fields with current values
  - Submit button text: "Update" (instead of "Add")
  - Call PUT `/attendees/:id`
  - Email uniqueness validation excludes current attendee's email

**Success Handling:**
- Close dialog
- Show toast: `"Attendee updated: {attendee.fullName} • Updated just now"`
- Invalidate attendees list query (refresh)

### Frontend: Attendees List Row

**Changes to dropdown menu:**
- Add "Edit" button before "Delete" button
- Edit button: `onClick={() => setEditingAttendee(attendee); setShowEditDialog(true)}`
- Delete button: existing behavior unchanged

**State:**
```typescript
const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
const [showEditDialog, setShowEditDialog] = useState(false);
```

## Data Flow

```
User clicks Edit → EditAttendee state set → Dialog opens pre-filled
                                              ↓
User modifies fields → Form validation → User clicks "Update"
                                              ↓
PUT /attendees/:id → Server validates & updates → Returns updated attendee
                                              ↓
Dialog closes → Toast shows → Query cache invalidated → List refreshes
```

## Error Handling

- **Email already taken (by another attendee):** Show validation error in form
- **Attendee not found:** Show toast error "Could not update attendee"
- **Network error:** Show toast error with message from server
- **Validation error:** Show inline field errors (same as add flow)

## Testing Checklist

- [ ] Edit button appears in dropdown menu
- [ ] Dialog pre-fills with current attendee data
- [ ] Can edit all fields (name, email, phone, newcomer status)
- [ ] Email uniqueness validation works (rejects if taken by another attendee)
- [ ] Email uniqueness allows same email for current attendee
- [ ] Dialog closes after successful update
- [ ] Success toast shows updated attendee name
- [ ] Attendees list refreshes after update
- [ ] Error cases show appropriate messages
- [ ] Edit dialog title changes based on mode (Add vs Edit)

## Migration & Backwards Compatibility

- No database schema changes required
- No breaking changes to existing API
- Purely additive feature
- Existing add/delete flows unaffected

## Future Enhancements

- Bulk edit multiple attendees
- Edit history/changelog
- Prevent editing if attendee was added in last N minutes
- Audit log of who edited what and when
