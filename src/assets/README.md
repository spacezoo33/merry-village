# Merry Village 2.0 artwork

These images were generated for this project with OpenAI image generation using the user-provided miniature reference for visual direction. The reference screenshot itself is not shipped. No third-party image service/CDN is required at runtime.

- `christmas-room.png`: 1024 × 1536 warm Christmas bokeh/background plate, currently used.
- `miniature-atlas.png`: 1254 × 1254 transparent atlas containing the wooden/snow/rail plinth, cottage, church, tree, Santa, snowman, reindeer, joined toy train and pine. Independent image viewports in `src/scene.ts` compose the scene. The train is now static.
- `special-buildings.png`: 2172 × 724 transparent atlas generated for this project: gift workshop, ice palace, gingerbread cottage. Each 724px region is a separate raster building, reused in three special layouts.
- `train-directions.png`: 1254 × 1254 directional locomotive/wagon atlas from the retired animation. Its future use is undecided, so the original is preserved in Git. It has no runtime import and is excluded from new web/AIT inputs by Vite's dependency graph.

All three pre-existing PNGs are preserved byte for byte; only the new special-building atlas is added. The retired animation is recoverable from commit d7b8cb8. No physical files were deleted merely because they are not currently imported.

Rails, snow surface and nameplate remain baked into the plinth; presents and some small foliage details remain part of tree/pine/cottage artwork. These details do not yet have independent replacement assets. 2.0 selects complete village layouts; individual ornament selection and replacement are absent. Six layouts share these local images, and the PNG photo renderer uses the same region/layout data. Night mode adjusts exposure/glow, rather than physically relighting the baked windows.
