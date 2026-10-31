# Merry Village 2.0 artwork

These images were generated for this project with OpenAI image generation using the user-provided miniature reference for visual direction. The reference screenshot itself is not shipped. No third-party image service/CDN is required at runtime.

- `christmas-room.png`: reused warm Christmas indoor background with candles/window.
- `product-villages.png`: new 1536×1024 transparent 3×2 atlas, six European collectible-product architecture/base plates. Generated for this update from the final user reference. Original saved at `/workspace/generated_images/exec-42a87288-f3b2-4863-a10e-11ae9a0aba29.png`. 512px cells, bottom row viewport inset 7px to exclude the preceding cell's edge shadow. No central tree or train is baked into these plates. Static terrain, architecture, people, lanterns, snow and Merry Christmas plaque remain baked. Central tree/train/rails render separately in Three.js.
- `miniature-atlas.png`, `special-buildings.png`, `train-directions.png`: original assets preserved byte for byte; no longer imported by the product edition's runtime. Old `art.ts`/`layouts.ts` remain available as legacy source, not the active product layout.

Photos composite the same product plate with a real current 3D framebuffer snapshot. Building windows and lantern illumination baked into the plates cannot be fully switched off; live decorative glow layers can. Fully independent architectural relighting would require unlit model/material assets.

- `fir-sprig.png`: new 1280×1280 alpha texture generated for this project (source `exec-98cdabc8-e3e8-4d6b-9315-473b9bb814c8.png`). Repeated on crossed needle cards distributed in 3D space, not a single tree poster. No external image host or copied product image is shipped. Existing architecture atlas/background and all original images remain untouched.
