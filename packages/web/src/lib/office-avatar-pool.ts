// Office avatar manifest for Jinn/Cuttlefish.
// PNGs live under packages/web/public/avatars/office/64/.
// Vite serves them at /avatars/office/64/<id>.png
// All render sites use sizes 20–36px; the 64px variant covers all of them.

export interface OfficeAvatar {
  id: string
  label: string
  path: string
  /** Keywords used by the avatar picker search */
  keywords: string[]
}

export const OFFICE_AVATARS: readonly OfficeAvatar[] = [
  { id: "backpack",            label: "Backpack",            path: "/avatars/office/64/backpack.png",            keywords: ["backpack", "bag", "school", "travel", "carry"] },
  { id: "binder_clip",         label: "Binder Clip",         path: "/avatars/office/64/binder_clip.png",         keywords: ["binder", "clip", "clamp", "fasten", "bind"] },
  { id: "blackboard",          label: "Blackboard",          path: "/avatars/office/64/blackboard.png",          keywords: ["blackboard", "chalkboard", "chalk", "board", "teach", "class"] },
  { id: "calculator",          label: "Calculator",          path: "/avatars/office/64/calculator.png",          keywords: ["calculator", "math", "numbers", "compute", "calculate"] },
  { id: "calendar",            label: "Calendar",            path: "/avatars/office/64/calendar.png",            keywords: ["calendar", "schedule", "date", "plan", "month"] },
  { id: "clipboard_checklist", label: "Clipboard Checklist", path: "/avatars/office/64/clipboard_checklist.png", keywords: ["clipboard", "checklist", "list", "task", "todo", "check"] },
  { id: "coffee_mug",          label: "Coffee Mug",          path: "/avatars/office/64/coffee_mug.png",          keywords: ["coffee", "mug", "cup", "drink", "caffeine", "tea"] },
  { id: "computer_monitor",    label: "Computer Monitor",    path: "/avatars/office/64/computer_monitor.png",    keywords: ["computer", "monitor", "screen", "display", "desktop", "pc"] },
  { id: "copier",              label: "Copier",              path: "/avatars/office/64/copier.png",              keywords: ["copier", "copy", "photocopy", "duplicate", "print"] },
  { id: "corded_phone",        label: "Corded Phone",        path: "/avatars/office/64/corded_phone.png",        keywords: ["phone", "corded", "telephone", "call", "landline", "hotline"] },
  { id: "crayon",              label: "Crayon",              path: "/avatars/office/64/crayon.png",              keywords: ["crayon", "color", "draw", "art", "wax"] },
  { id: "desk_clock",          label: "Desk Clock",          path: "/avatars/office/64/desk_clock.png",          keywords: ["clock", "desk", "time", "watch", "timer"] },
  { id: "desk_lamp",           label: "Desk Lamp",           path: "/avatars/office/64/desk_lamp.png",           keywords: ["lamp", "desk", "light", "illuminate", "bulb"] },
  { id: "document_stack",      label: "Document Stack",      path: "/avatars/office/64/document_stack.png",      keywords: ["document", "stack", "paper", "files", "pages", "report"] },
  { id: "envelope",            label: "Envelope",            path: "/avatars/office/64/envelope.png",            keywords: ["envelope", "mail", "letter", "send", "message", "email"] },
  { id: "eraser",              label: "Eraser",              path: "/avatars/office/64/eraser.png",              keywords: ["eraser", "erase", "correct", "undo", "remove"] },
  { id: "file_folder",         label: "File Folder",         path: "/avatars/office/64/file_folder.png",         keywords: ["folder", "file", "directory", "organize", "store"] },
  { id: "filing_cabinet",      label: "Filing Cabinet",      path: "/avatars/office/64/filing_cabinet.png",      keywords: ["filing", "cabinet", "storage", "archive", "drawer"] },
  { id: "glue_bottle",         label: "Glue Bottle",         path: "/avatars/office/64/glue_bottle.png",         keywords: ["glue", "bottle", "adhesive", "stick", "paste"] },
  { id: "highlighter",         label: "Highlighter",         path: "/avatars/office/64/highlighter.png",         keywords: ["highlighter", "highlight", "marker", "color", "review"] },
  { id: "hole_punch",          label: "Hole Punch",          path: "/avatars/office/64/hole_punch.png",          keywords: ["hole", "punch", "binder", "perforate", "paper"] },
  { id: "in_tray",             label: "In Tray",             path: "/avatars/office/64/in_tray.png",             keywords: ["in", "tray", "inbox", "receive", "queue"] },
  { id: "keyboard",            label: "Keyboard",            path: "/avatars/office/64/keyboard.png",            keywords: ["keyboard", "type", "input", "computer", "keys"] },
  { id: "lunch_bag",           label: "Lunch Bag",           path: "/avatars/office/64/lunch_bag.png",           keywords: ["lunch", "bag", "food", "meal", "eat"] },
  { id: "lunchbox",            label: "Lunchbox",            path: "/avatars/office/64/lunchbox.png",            keywords: ["lunchbox", "lunch", "box", "food", "meal", "container"] },
  { id: "marker",              label: "Marker",              path: "/avatars/office/64/marker.png",              keywords: ["marker", "pen", "draw", "color", "write"] },
  { id: "name_badge",          label: "Name Badge",          path: "/avatars/office/64/name_badge.png",          keywords: ["name", "badge", "id", "identity", "tag", "label"] },
  { id: "notebook",            label: "Notebook",            path: "/avatars/office/64/notebook.png",            keywords: ["notebook", "notes", "journal", "write", "book"] },
  { id: "office_chair",        label: "Office Chair",        path: "/avatars/office/64/office_chair.png",        keywords: ["chair", "office", "seat", "furniture", "sit"] },
  { id: "office_desk",         label: "Office Desk",         path: "/avatars/office/64/office_desk.png",         keywords: ["desk", "office", "table", "workspace", "work"] },
  { id: "office_plant",        label: "Office Plant",        path: "/avatars/office/64/office_plant.png",        keywords: ["plant", "office", "green", "nature", "decor"] },
  { id: "out_tray",            label: "Out Tray",            path: "/avatars/office/64/out_tray.png",            keywords: ["out", "tray", "outbox", "send", "output"] },
  { id: "paper_cutter",        label: "Paper Cutter",        path: "/avatars/office/64/paper_cutter.png",        keywords: ["paper", "cutter", "cut", "slice", "trim", "guillotine"] },
  { id: "paper_shredder",      label: "Paper Shredder",      path: "/avatars/office/64/paper_shredder.png",      keywords: ["shredder", "shred", "destroy", "secure", "paper"] },
  { id: "paperclip",           label: "Paperclip",           path: "/avatars/office/64/paperclip.png",           keywords: ["paperclip", "clip", "attach", "fasten", "paper"] },
  { id: "pen",                 label: "Pen",                 path: "/avatars/office/64/pen.png",                 keywords: ["pen", "write", "ink", "sign", "draw"] },
  { id: "pencil",              label: "Pencil",              path: "/avatars/office/64/pencil.png",              keywords: ["pencil", "write", "draw", "sketch", "draft"] },
  { id: "printer",             label: "Printer",             path: "/avatars/office/64/printer.png",             keywords: ["printer", "print", "paper", "output", "document"] },
  { id: "projector",           label: "Projector",           path: "/avatars/office/64/projector.png",           keywords: ["projector", "present", "slide", "screen", "beam"] },
  { id: "push_pin",            label: "Push Pin",            path: "/avatars/office/64/push_pin.png",            keywords: ["push", "pin", "tack", "bulletin", "board", "note"] },
  { id: "ruler",               label: "Ruler",               path: "/avatars/office/64/ruler.png",               keywords: ["ruler", "measure", "straight", "line", "length"] },
  { id: "scissors",            label: "Scissors",            path: "/avatars/office/64/scissors.png",            keywords: ["scissors", "cut", "trim", "snip", "craft"] },
  { id: "stapler",             label: "Stapler",             path: "/avatars/office/64/stapler.png",             keywords: ["stapler", "staple", "bind", "attach", "fasten"] },
  { id: "sticky_notes",        label: "Sticky Notes",        path: "/avatars/office/64/sticky_notes.png",        keywords: ["sticky", "notes", "post-it", "memo", "reminder"] },
  { id: "tape_dispenser",      label: "Tape Dispenser",      path: "/avatars/office/64/tape_dispenser.png",      keywords: ["tape", "dispenser", "stick", "adhesive", "roll"] },
  { id: "thumb_drive",         label: "Thumb Drive",         path: "/avatars/office/64/thumb_drive.png",         keywords: ["thumb", "drive", "usb", "flash", "storage", "memory"] },
  { id: "wall_clock",          label: "Wall Clock",          path: "/avatars/office/64/wall_clock.png",          keywords: ["clock", "wall", "time", "hour", "watch"] },
  { id: "water_bottle",        label: "Water Bottle",        path: "/avatars/office/64/water_bottle.png",        keywords: ["water", "bottle", "drink", "hydrate", "beverage"] },
  { id: "whiteboard",          label: "Whiteboard",          path: "/avatars/office/64/whiteboard.png",          keywords: ["whiteboard", "board", "write", "plan", "meeting"] },
  { id: "whiteout",            label: "Whiteout",            path: "/avatars/office/64/whiteout.png",            keywords: ["whiteout", "correction", "liquid", "fix", "erase"] },
]

export type OfficeAvatarId = (typeof OFFICE_AVATARS)[number]["id"]

export function officeAvatarPath(id: OfficeAvatarId | string): string | null {
  return OFFICE_AVATARS.find((item) => item.id === id)?.path ?? null
}
