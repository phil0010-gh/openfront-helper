# OpenFront Auto-Join & Helpers

Chrome extension for `https://openfront.io` that automatically joins public lobbies when they match your selected criteria.

Each option now has three states:

- `Include`: the option must be present
- `Exclude`: the option must not be present
- empty: the option is ignored

## Criteria

- `FFA`
- `Duos`
- `Trios`
- `Teams larger than Trios`
- `Random spawn`
- `Alliances disabled`
- `2x gold`
- `0M starting gold`
- `5M starting gold`
- `25M starting gold`
- maps from `assets/map-thumbnails`

The matching logic is split into two groups:

- `FFA`, `Duos`, `Trios`, and `Teams larger than Trios` behave as a lobby-type group
- if one or more of them are `Include`, any one of them is enough
- `Exclude` on any of them blocks that lobby type
- `Duos` matches `Teams of 2`
- `Trios` matches `Teams of 3`
- `Teams larger than Trios` matches team lobbies with more than 3 players per team

- `Random spawn`, `Alliances disabled` and `2x gold`
- `Include`: must be present in the lobby
- `Exclude`: must not be present in the lobby
- empty: ignored

- `0M`, `5M` and `25M starting gold`
- `Include` and `Exclude` can be used on different starting gold values at the same time
- once at least one `Include` in this group is active, any included value is enough
- `Exclude` values are always rejected
- if no starting-gold `Include` is active, only starting-gold `Excludes` are checked
- `0M` means default starting gold and does not appear as a dedicated badge in OpenFront

- Map buttons are generated from the manifests in `assets/map-thumbnails`.
- Selecting one or more maps creates a map include group.
- Once at least one map is selected, any selected map is enough.
- `Exclude` on a map blocks that map.

The `FFA` option checks the OpenFront `Free For All` game mode.
As a fallback, the extension also checks for visible `FREE FOR ALL` text inside the lobby data.

## Installation

1. Open `chrome://extensions` in Chrome
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the [chrome-extension](C:\Users\win\WebstormProjects\openfronti\chrome-extension) folder

## Behavior

- The extension listens to OpenFront's real public lobby updates.
- On a match, it triggers the same join flow as a manual public lobby join.
- Once auto-join fires, it automatically turns itself off.
- A short alert sound is played when auto-join fires.
- The same lobby will not be retried for 30 seconds after an attempt.
