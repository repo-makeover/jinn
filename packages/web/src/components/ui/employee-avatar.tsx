import { useSettings } from "@/routes/settings-provider"
import { emojiForName } from "@/lib/emoji-pool"
import { officeAvatarPath } from "@/lib/office-avatar-pool"

/** Parse "office:<id>" avatar field into a resolved image URL, or null. */
function resolveOfficeAvatar(value: string | undefined): string | null {
  if (!value?.startsWith("office:")) return null
  return officeAvatarPath(value.slice("office:".length))
}

interface EmployeeAvatarProps {
  name: string
  /** Office avatar id from the employee YAML, e.g. "office:pencil". When set,
   *  renders a PNG instead of an emoji. Settings overrides still take precedence. */
  avatar?: string
  size?: number
  className?: string
  onClick?: () => void
}

export function EmployeeAvatar({
  name,
  avatar: avatarProp,
  size = 32,
  className,
  onClick,
}: EmployeeAvatarProps) {
  const { settings } = useSettings()
  const override = name ? settings.employeeOverrides[name] : undefined

  // Resolution order: settings.profileImage > settings.emoji (if office:) > avatarProp > settings.emoji > emojiForName
  const imgSrc =
    resolveOfficeAvatar(override?.profileImage) ??
    resolveOfficeAvatar(override?.emoji) ??
    resolveOfficeAvatar(avatarProp)

  const emoji = override?.emoji?.startsWith("office:") ? undefined : (override?.emoji || emojiForName(name || ''))
  const fontSize = Math.round(size * 0.6)

  const sharedStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    lineHeight: 1,
    borderRadius: "50%",
    flexShrink: 0,
    cursor: onClick ? "pointer" : undefined,
    userSelect: "none",
    overflow: "hidden",
  }

  if (imgSrc) {
    return (
      <span
        className={className}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        style={sharedStyle}
      >
        <img
          src={imgSrc}
          alt={name}
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "contain", display: "block", borderRadius: "50%" }}
          draggable={false}
        />
      </span>
    )
  }

  return (
    <span
      className={className}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{ ...sharedStyle, fontSize }}
    >
      {emoji}
    </span>
  )
}

/** Standalone avatar preview without settings context (for pickers / settings page) */
export function AvatarPreview({
  name,
  size = 32,
  className,
  onClick,
  emoji: overrideEmoji,
  avatar: avatarProp,
}: EmployeeAvatarProps & { emoji?: string }) {
  const imgSrc =
    resolveOfficeAvatar(overrideEmoji) ??
    resolveOfficeAvatar(avatarProp)

  const emoji = overrideEmoji?.startsWith("office:") ? undefined : (overrideEmoji || emojiForName(name))
  const fontSize = Math.round(size * 0.6)

  const sharedStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    lineHeight: 1,
    borderRadius: "50%",
    flexShrink: 0,
    cursor: onClick ? "pointer" : undefined,
    userSelect: "none",
    overflow: "hidden",
  }

  if (imgSrc) {
    return (
      <span
        className={className}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        style={sharedStyle}
      >
        <img
          src={imgSrc}
          alt={name}
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: "contain", display: "block", borderRadius: "50%" }}
          draggable={false}
        />
      </span>
    )
  }

  return (
    <span
      className={className}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{ ...sharedStyle, fontSize }}
    >
      {emoji}
    </span>
  )
}
