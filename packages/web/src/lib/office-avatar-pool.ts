// Office avatar manifest for Jinn/Cuttlefish.
// PNGs live under packages/web/public/avatars/office/64/.
// Vite serves them at /avatars/office/64/<id>.png
// All render sites use sizes 20–36px, so only the 64px variant is needed.

export interface OfficeAvatar {
  id: string
  label: string
  path: string
}

export const OFFICE_AVATARS = [
  { id: "backpack",            label: "Backpack",            path: "/avatars/office/64/backpack.png" },
  { id: "binder_clip",         label: "Binder Clip",         path: "/avatars/office/64/binder_clip.png" },
  { id: "blackboard",          label: "Blackboard",          path: "/avatars/office/64/blackboard.png" },
  { id: "calculator",          label: "Calculator",          path: "/avatars/office/64/calculator.png" },
  { id: "calendar",            label: "Calendar",            path: "/avatars/office/64/calendar.png" },
  { id: "clipboard_checklist", label: "Clipboard Checklist", path: "/avatars/office/64/clipboard_checklist.png" },
  { id: "computer_monitor",    label: "Computer Monitor",    path: "/avatars/office/64/computer_monitor.png" },
  { id: "corded_phone",        label: "Corded Phone",        path: "/avatars/office/64/corded_phone.png" },
  { id: "crayon",              label: "Crayon",              path: "/avatars/office/64/crayon.png" },
  { id: "desk_lamp",           label: "Desk Lamp",           path: "/avatars/office/64/desk_lamp.png" },
  { id: "document_stack",      label: "Document Stack",      path: "/avatars/office/64/document_stack.png" },
  { id: "envelope",            label: "Envelope",            path: "/avatars/office/64/envelope.png" },
  { id: "eraser",              label: "Eraser",              path: "/avatars/office/64/eraser.png" },
  { id: "file_folder",         label: "File Folder",         path: "/avatars/office/64/file_folder.png" },
  { id: "filing_cabinet",      label: "Filing Cabinet",      path: "/avatars/office/64/filing_cabinet.png" },
  { id: "highlighter",         label: "Highlighter",         path: "/avatars/office/64/highlighter.png" },
  { id: "hole_punch",          label: "Hole Punch",          path: "/avatars/office/64/hole_punch.png" },
  { id: "in_tray",             label: "In Tray",             path: "/avatars/office/64/in_tray.png" },
  { id: "keyboard",            label: "Keyboard",            path: "/avatars/office/64/keyboard.png" },
  { id: "marker",              label: "Marker",              path: "/avatars/office/64/marker.png" },
  { id: "name_badge",          label: "Name Badge",          path: "/avatars/office/64/name_badge.png" },
  { id: "notebook",            label: "Notebook",            path: "/avatars/office/64/notebook.png" },
  { id: "office_desk",         label: "Office Desk",         path: "/avatars/office/64/office_desk.png" },
  { id: "out_tray",            label: "Out Tray",            path: "/avatars/office/64/out_tray.png" },
  { id: "paper_cutter",        label: "Paper Cutter",        path: "/avatars/office/64/paper_cutter.png" },
  { id: "paper_shredder",      label: "Paper Shredder",      path: "/avatars/office/64/paper_shredder.png" },
  { id: "pen",                 label: "Pen",                 path: "/avatars/office/64/pen.png" },
  { id: "pencil",              label: "Pencil",              path: "/avatars/office/64/pencil.png" },
  { id: "printer",             label: "Printer",             path: "/avatars/office/64/printer.png" },
  { id: "projector",           label: "Projector",           path: "/avatars/office/64/projector.png" },
  { id: "push_pin",            label: "Push Pin",            path: "/avatars/office/64/push_pin.png" },
  { id: "ruler",               label: "Ruler",               path: "/avatars/office/64/ruler.png" },
  { id: "scissors",            label: "Scissors",            path: "/avatars/office/64/scissors.png" },
  { id: "stapler",             label: "Stapler",             path: "/avatars/office/64/stapler.png" },
  { id: "sticky_notes",        label: "Sticky Notes",        path: "/avatars/office/64/sticky_notes.png" },
  { id: "tape_dispenser",      label: "Tape Dispenser",      path: "/avatars/office/64/tape_dispenser.png" },
  { id: "thumb_drive",         label: "Thumb Drive",         path: "/avatars/office/64/thumb_drive.png" },
  { id: "wall_clock",          label: "Wall Clock",          path: "/avatars/office/64/wall_clock.png" },
  { id: "whiteboard",          label: "Whiteboard",          path: "/avatars/office/64/whiteboard.png" },
  { id: "whiteout",            label: "Whiteout",            path: "/avatars/office/64/whiteout.png" },
] as const satisfies readonly OfficeAvatar[]

export type OfficeAvatarId = (typeof OFFICE_AVATARS)[number]["id"]

export function officeAvatarPath(id: OfficeAvatarId | string): string | null {
  return OFFICE_AVATARS.find((item) => item.id === id)?.path ?? null
}
