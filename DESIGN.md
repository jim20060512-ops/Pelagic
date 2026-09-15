---
name: Pelagic
description: A dark, editorial dive-log interface for recording underwater encounters.
colors:
  ocean-base: "#061a2e"
  rail: "#07192b"
  surface: "#0a2237"
  surface-raised: "#0d2a41"
  ocean-glow: "#164c68"
  divider: "#31556a"
  mist: "#e9f3f6"
  body-muted: "#a7c1c9"
  label-muted: "#81a9b6"
  seafoam: "#bce0df"
  focus-aqua: "#6fe0df"
  coral: "#e69b55"
  coral-light: "#ffc383"
typography:
  display:
    fontFamily: "Playfair Display, serif"
    fontSize: "clamp(34px, 4vw, 54px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Playfair Display, serif"
    fontSize: "45px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Playfair Display, serif"
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "DM Mono, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.1em"
rounded:
  compact: "8px"
  control: "9px"
  navigation: "10px"
  pill: "20px"
  circle: "50%"
spacing:
  micro: "8px"
  compact: "10px"
  control: "12px"
  card-gap: "18px"
  mobile-gutter: "20px"
  section: "40px"
  desktop-gutter: "58px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.rail}"
    rounded: "{rounded.control}"
    padding: "12px 17px"
  button-primary-hover:
    backgroundColor: "{colors.coral-light}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.mist}"
    rounded: "{rounded.control}"
    padding: "11px 15px"
  navigation-active:
    backgroundColor: "#13374d"
    textColor: "#f4fbfc"
    rounded: "{rounded.navigation}"
    padding: "12px"
  card-sighting:
    backgroundColor: "{colors.surface}"
  field-line:
    backgroundColor: "transparent"
    textColor: "#f1fbfb"
    padding: "10px 0"
---

# Design System: Pelagic

## Overview

**Creative North Star: "The Nautical Field Journal"**

Pelagic combines an inky, instrument-like shell with an editorial record of underwater life. Large serif headlines and species names give photographs and memories a reflective cadence; compact monospaced labels supply the measured, logged quality of dates, depths, steps, and map metadata.

The interface is deliberately dark and spatially restrained. Deep blue surfaces, thin marine-blue rules, cropped photography, and a single coral action color keep the focus on the dive record. On narrow screens, the fixed rail becomes a translucent bottom navigation while the core hierarchy and warm action point remain intact.

**Key Characteristics:**

- Dark ocean fieldwork atmosphere with a restrained editorial voice.
- Serif-led narrative hierarchy paired with operational mono labels.
- Flat tonal surfaces, fine dividers, and photographic evidence over decorative chrome.
- Coral is the active/action signal; seafoam and aqua support confirmation and focus.

## Colors

The palette uses layered blue-black water as its material, with pale mist for reading, seafoam for quiet confirmation, and coral as the singular warm call to action.

### Primary

- **Dive Coral:** The action color for primary buttons, active step indicators, inline arrows, and map/list markers.

### Secondary

- **Quiet Seafoam:** A pale aquatic confirmation color for tags, text links, followed states, and toast surfaces.
- **Focus Aqua:** The visible keyboard focus outline and the active rail inset marker.

### Neutral

- **Ocean Base:** The page ground and dark photo-label backing.
- **Rail Night:** The fixed navigation and primary-control text ground.
- **Submerged Surface / Raised Surface:** The card and hover surface pair.
- **Ocean Glow:** The upper radial illumination behind the application shell.
- **Marine Divider:** The recurring one-pixel structural rule for fields, sections, maps, and rail boundaries.
- **Mist:** The default reading color.
- **Body Muted / Label Muted:** The supporting-copy and metadata pair.

### Named Rules

**The Coral Signal Rule.** Coral is reserved for an action, a state change, or a location/species marker; it does not become a general surface color.

## Typography

**Display Font:** Playfair Display (with serif fallback)
**Body Font:** Manrope (with sans-serif fallback)
**Label/Mono Font:** DM Mono (with monospace fallback)

**Character:** Playfair Display carries the reflective, archival voice in large headings, species names, and selected field values. Manrope keeps controls and supporting copy clear, while DM Mono makes operational metadata feel measured and durable.

### Hierarchy

- **Display** (600, responsive display scale, 1.08): Main home, map, and identification headlines.
- **Headline** (600, 45px, 1.12): Flow-stage and detail headings.
- **Title** (600, 26px): Topbar page title; smaller card and section titles retain the same serif family at implemented sizes.
- **Body** (400, inherited size, 1.7): Supporting explanatory copy, constrained to 500px where used beside a hero heading.
- **Label** (500, 11px, 0.1em, uppercase): Metadata, dates, steps, and field labels; the stats variant is 10px with 0.08em tracking.

### Named Rules

**The Journal-and-Instrument Rule.** Use Playfair Display for the remembered encounter and DM Mono for the logged fact; keep utility controls in Manrope.

## Layout

Desktop uses a fixed 220px left rail and a content column offset by that width. The content is capped at 1200px, with 58px horizontal padding and 44px top padding. Home content begins with a flexible intro, then a three-column stats strip and a three-column, 18px-gap sighting grid. The record flow uses paired columns for upload and identification, then a .9fr/1.1fr details split.

At 800px and below, the rail is removed, content becomes full width with 20px horizontal padding and 94px bottom clearance, and a fixed blurred bottom navigation appears. The sighting grid becomes a one-column horizontal card; flow and feature layouts stack; the map list becomes two columns. The base viewport minimum is 320px.

## Elevation & Depth

This is a tonal-layered system with only targeted elevation. The shell uses a radial ocean glow, cards lift by translation and a slightly lighter blue on hover, and photo surfaces create depth through cropping and a bottom gradient. Primary calls to action, the raised mobile add button, and the toast carry the only declared outer shadows; the scan indicator adds a narrow aqua glow.

### Shadow Vocabulary

- **Action Lift** (`0 8px 20px #0003`): Primary, new-dive, and publish buttons.
- **Mobile Add Lift** (`0 4px 14px #0005`): The circular central action in the mobile navigation.
- **Scan Glow** (`0 0 14px #94f5e9`): The animated identification scan line.

### Named Rules

**The Evidence-First Depth Rule.** Use tonal separation, photography, and fine rules for resting depth; reserve shadows for an actionable or transient element.

## Shapes

The system mixes nearly square image and content surfaces with gently rounded controls. Primary and secondary buttons use a 9px radius, navigation rows use 10px, the toast uses 8px, map pins use a 20px pill, and icon/avatar/add controls use circles. Borders are fine and blue-toned rather than high-contrast; images are clipped by their containers without rounded card corners.

## Components

### Buttons

Buttons are compact, confident instruments rather than large pills.

- **Shape:** Gently curved control corners (9px); icon-only controls are circular.
- **Primary:** Coral ground, dark rail-colored text, 12px by 17px padding, 800-weight 13px Manrope, and a compact 9px icon gap.
- **Hover / Focus:** Primary background lightens; interactive text and fields use a 2px aqua focus outline with a 3px offset. Buttons with hover movement use their specific transition.
- **Secondary / Ghost:** Secondary uses a transparent ground, pale text, a 1px muted-aqua border, and 11px by 15px padding. Text links are borderless seafoam with a coral arrow.

### Cards / Containers

- **Corner Style:** Sighting and feature containers are square; control corners are not transferred to card surfaces.
- **Background:** Sighting cards use the submerged surface and shift to the raised surface on hover; feature posts use their distinct blue surface.
- **Shadow Strategy:** No resting shadow; sighting cards translate upward 5px on hover.
- **Border:** Content is structured principally with 1px marine dividers.
- **Internal Padding:** Sighting copy uses 15px 16px 18px; feature copy uses 55px 42px on desktop and 30px 25px on mobile.

### Inputs / Fields

- **Style:** Transparent, borderless fields with a single bottom marine-blue rule; identification field values use Playfair Display while detail values use Manrope.
- **Focus:** The bottom border becomes coral. Keyboard focus also receives the global aqua outline.
- **Error / Disabled:** No error or disabled treatment is implemented.

### Navigation

The desktop rail is a fixed dark column with 12px padded rows, 13px icon-label gaps, muted default labels, and an active dark-blue fill, pale text, and 2px aqua inset edge. At the mobile breakpoint it becomes a fixed translucent, blurred bottom bar; its central coral circular add control rises above the bar.

### Dive Meter

The record-flow meter is a ruled, mono-label progress strip. Its compact numbered circles are muted at rest, coral at the active step, and seafoam when complete; the bounding log/depth labels disappear on mobile to preserve the step sequence.

### Sighting Metadata

Photo cards overlay depth and freshness tags directly on the image. Depth is dark-backed mono text; the latest tag is seafoam-backed with dark text. The card body joins date, serif species name, italic Latin name, and a ruled location row.

## Do's and Don'ts

### Do:

- **Do** keep the inky ocean ground, layered blue surfaces, and thin marine dividers as the default material system.
- **Do** put the remembered encounter in Playfair Display and the logged metadata in DM Mono.
- **Do** use coral for calls to action and small status/marker moments, with seafoam/aqua for confirmation and focus.
- **Do** preserve the implemented 800px mobile transition from fixed side rail to fixed blurred bottom navigation.
- **Do** let real underwater photography carry the visual focal point, using the existing crop and overlay treatment for legible metadata.

### Don't:

- **Don't** apply rounded corners or shadows indiscriminately to cards and large surfaces; the implemented resting composition is mostly flat and square.
- **Don't** turn muted metadata into primary body text; its compact mono hierarchy is intentional.
- **Don't** use coral as a large background field or general decoration; it is an action signal.
- **Don't** remove the visible aqua focus treatment from interactive controls.
