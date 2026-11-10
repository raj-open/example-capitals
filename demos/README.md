# Demos #

Screenshots of the application, captured from the running app with `just demos` (see [/tests/demos](../tests/demos/demos.spec.ts)). So is the animation at the top of the [README](../README.md) (`img/hero.webp`: the cover first, then the scenes below; joined by ffmpeg, cf. [hero.ts](../tests/demos/hero.ts)).

## Overview ##

The list of capitals next to the map: selecting a capital (in the list or on the map) flies there and opens a popup, in which the colour of its marker can be changed.

![List of capitals next to the map, with London selected and its colour popup](img/overview.webp)

## Search ##

Search by country and by capital (both narrow down); only matches are shown, ↑/↓ step through them and Enter selects.

![Search for "korea", with South Korea selected](img/search.webp)

## Add, edit and delete ##

Each entry can be edited in place (name, country, coordinates and the colour of its marker) or deleted; `+` in the header adds a new one.

![Edit form of Nuuk (Greenland), with its colour](img/edit.webp)

## Map settings ##

Basemap, light preset, theme and number format.

![Settings panel on the map](img/settings.webp)

![Map in daylight, with Tokyo selected](img/day.webp)

## Phones ##

On narrow screens the list sits below the map and can be collapsed to a bar.

| Map and list | List collapsed |
| :----------: | :------------: |
| ![Map above the list on a phone, with Oslo selected](img/phone.webp) | ![Map only on a phone, the list collapsed to a bar, with Seoul selected](img/phone-map.webp) |

## Social preview ##

[img/social-preview.jpg](img/social-preview.jpg) (2560 × 1280, the cover of the hero) is the image for link previews of the repository: upload it on GitHub under Settings → General → Social preview.
