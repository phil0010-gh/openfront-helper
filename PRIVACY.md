# Privacy Policy

This privacy policy applies to the unofficial **OpenFront Auto-Join & Helpers**
browser extension.

## Current extension behavior

The extension stores its settings locally in the browser extension storage. This
includes options such as selected auto-join filters, helper toggles, language,
popup preferences, custom notification sound data, and whether anonymous usage
analytics are enabled. If extension chat is used, a random local chat user
identifier and chosen display name are also stored locally.

The extension reads OpenFront page and lobby/game information only to provide
its features, such as auto-join filtering, helper overlays, map filters, and
in-game helper calculations.

The extension may process personal communications when users send chat messages,
user activity when optional anonymous analytics are enabled, and OpenFront
page/lobby/game content only as needed to provide the extension features.

## Anonymous usage analytics

Anonymous usage analytics are optional and disabled by default.

If enabled, the extension may send coarse usage events to Google Analytics, such
as feature toggles, extension version, and language. These events are intended to
help prioritize bug fixes and improvements.

The analytics implementation is designed not to send:

- OpenFront account information
- player names
- lobby IDs
- game IDs
- chat messages
- free-form gameplay text

When analytics are enabled, a random local analytics identifier may be created.
That identifier is deleted from local extension storage when analytics are
disabled.

## Extension chat

The project includes extension-based chat features:

- a **global chat** where users of this extension can write with other extension
  users
- a **lobby chat** where users of this extension can write with other extension
  users who are detected to be in the same OpenFront round or lobby

These chat features are not purely local. They use Supabase as a backend service
to deliver messages between users.

If you use chat, the following data may be transmitted to Supabase:

- chat messages you send
- a random extension chat user identifier
- your chosen chat display name or nickname
- the chat room type, such as global chat or lobby chat
- a lobby, game, or room identifier used to place users into the same lobby chat,
  when such an identifier can be detected
- timestamps and basic delivery metadata
- moderation metadata, such as reports, blocked users, or rate-limit events

Supabase may also process technical connection data such
as IP address, user agent, and request logs as part of normal network operation.

Chat messages are configured to expire after 24 hours. The extension filters out
older messages and the chat backend is configured to delete expired chat rows.

Do not send sensitive information, passwords, personal contact details, private
messages, or other confidential information through the extension chat.

## Chat moderation and safety

Public chat can be abused. The chat service may use moderation tools such as:

- message rate limits
- spam prevention
- temporary or permanent bans
- block or report features
- deletion of abusive messages
- basic logging needed to investigate abuse

Moderation features are limited in the first chat version. Avoid sharing
sensitive information and report abuse through the project repository.

## Data sharing

The extension may share data with:

- Google Analytics, only if anonymous usage analytics are enabled
- Supabase, if chat features are used
- browser extension APIs needed to store settings and run extension features

The extension does not sell personal data.

## Data retention

Local settings remain in your browser until you change them, clear extension
storage, or uninstall the extension.

Analytics events are handled according to Google Analytics retention settings.

Chat messages are intended to be retained for up to 24 hours and are filtered
out by the extension after that period. The backend is configured to delete
expired chat rows.

## User control

You can:

- disable anonymous usage analytics in the extension popup
- clear local extension data through your browser settings
- uninstall the extension to remove its local data from your browser
- avoid using chat features if you do not want chat data transmitted to Supabase

## Unofficial project

This extension is unofficial and is not affiliated with, endorsed by, or operated
by OpenFront.

## Contact

For privacy questions or security concerns, open an issue in the project
repository:

https://github.com/phil0010-gh/openfront-helper
