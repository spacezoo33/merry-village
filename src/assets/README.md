# Merry Village local artwork

These images were generated specifically for this project with OpenAI image generation, using the user-provided Christmas miniature reference for visual direction. The reference screenshot itself is not shipped. No third-party image service, font request, or CDN is required at runtime.

- `christmas-room.png`: 1024 × 1536 photographic warm Christmas bokeh/background plate. No village or foreground characters are baked into it.
- `train-directions.png`: 1254 × 1254 transparent atlas of separately generated locomotive and wagon, eight fixed-camera headings each. `src/train-art.ts` isolates each frame and normalizes midpoint-of-bogie anchors and consistent roof heights without rotating the sprite upright on curves. `src/train-consist.ts` supplies the physical chassis/hitch geometry; visible couplers join these chassis mounts.
- `miniature-atlas.png`: 1254 × 1254 transparent raster atlas containing nine original miniature asset types: empty walnut/snow/rail plinth with gold Merry Village plaque, cottage, church, decorated tree, Santa, snowman, reindeer, toy train, and small pine.

`src/scene.ts` records the actual pixel regions, rather than assuming perfectly equal grid cells. Independent SVG viewports crop the raster art during rendering; they do not draw substitute vector ornaments. All references resolve through Vite to packaged local files. The shared atlas is fetched once and reused.

The scene uses three independently positioned cottage instances, one church, three pines, and separate tree, Santa, snowman, reindeer, train and plinth objects. Selection applies to the object/group, not the whole scene. The five bottom menu thumbnails reuse the same artwork.

Limitations: rails, snow surface and nameplate are baked into the plinth; presents and some small snow/foliage details are baked into the tree, pine or cottage. These sub-details cannot yet be exchanged independently. The old joined train sprite is only used for the menu thumbnail; the live scene uses the new directional locomotive and two separate wagons. Future fine-grained editing needs additional isolated art for those subparts. Night mode changes scene/background exposure and glow; the artwork's baked window lighting is not physically relit.

PNG originals are retained without lossy recompression (about 5.8 MB combined). Original generated files remain outside the checkout in /workspace/generated_images; these repository copies are sufficient for a fresh clone and all builds.
