<script lang="ts">
  import {
    scaleFactor,
    videoClips,
    time,
    selected,
    scroll,
    audioClips,
    scale,
  } from "$lib/stores";
  import { getClipDuration, getClipEndPos } from "$lib/utils";
  import { createEventDispatcher } from "svelte";

  export let clip: App.Clip;
  // this is set to 9 as a dirty default
  export let timelineOffset = 9;

  $: selectedUUID = $selected ? $selected[0] : null;

  let canMoveClip = false;
  let resizeMode: "left" | "right" | null = null;

  /**
   * The last offset of the clip. We use this to diff against the current clip
   * offset to prevent reactivity from unnecessarily triggering the clipMove
   * event.
   */
  let lastOffset = 0;

  let clipEl: HTMLButtonElement;

  /**
   * Distance from left of clip to mouse. Used to calculate new offset and to
   * maintain position of mouse on clip.
   */
  let moveOffset = 0;
  let initialResizeMousePos = 0;

  /**
   * Initial values of clip when resizing, so resize calculates don't resize
   * based on recently updated start/end/offset values
   */
  let initialTrimValues = { start: 0, end: 0, offset: 0, duration: 0 };

  let settingsOpen = false;

  $: clipLength = clip.media.duration - clip.start - clip.end;

  $: transform = `translateX(${clip.offset * $scaleFactor - $scroll}px)`;
  $: width = `${clipLength * $scaleFactor}px`;

  const moveClip = (e: MouseEvent) => {
    // subtract timelineOffset to get clientX relative to timeline
    const offsetPos = e.clientX - timelineOffset - moveOffset + $scroll;
    const offset = Math.max(0, offsetPos / $scaleFactor);

    // update offset of clip with new offset, snapping if possible
    clip.offset = e.shiftKey ? offset : snapOnMove(offset);

    // reassign to trigger reactivity
    if (clip.media.type === "audio") $audioClips = [...$audioClips];
    else $videoClips = [...$videoClips];
  };

  const resizeClip = (e: MouseEvent) => {
    const delta = e.clientX - initialResizeMousePos;
    const dt = delta / $scaleFactor;

    if (clip.media.type === "image") {
      if (resizeMode === "left") {
        clip.offset = Math.max(0, initialTrimValues.offset + dt);
        // FIXME: if clip offset moved < 0, overall duration will begin to
        // increase (i.e. end of clip moves)
        clip.media.duration = Math.max(0, initialTrimValues.duration - dt);
      } else if (resizeMode === "right") {
        clip.media.duration = Math.max(0, initialTrimValues.duration + dt);
      }
      return;
    }

    if (resizeMode === "left") {
      let start = Math.min(
        Math.max(0, initialTrimValues.start + dt),
        clip.media.duration - clip.end
      );

      // if we're holding shift, we don't need to perform resize snap.
      if (e.shiftKey) {
        clip.offset = initialTrimValues.offset;
        clip.start = start;
        return;
      }

      let offset = Math.max(
        initialTrimValues.offset - initialTrimValues.start,
        initialTrimValues.offset + dt
      );

      let [snapOffset, snapStart] = snapOnResize("left", offset, start);

      clip.offset = snapOffset;
      clip.start = snapStart;
    } else if (resizeMode === "right") {
      let end = Math.min(
        Math.max(0, initialTrimValues.end - dt),
        clip.media.duration - clip.start
      );

      let [snapOffset, snapEnd] = snapOnResize(
        "right",
        initialTrimValues.offset,
        end
      );

      clip.offset = snapOffset;
      clip.end = snapEnd;
    }

    // reassign to trigger reactivity
    if (clip.media.type === "audio") $audioClips = [...$audioClips];
    else $videoClips = [...$videoClips];
  };

  /**
   * Snaps this clip to the scrubber, or the nearest clip, if within threshold.
   * Returns a new offset if a snap position is found.
   *
   * @param offset - The offset of the clip.
   */
  const snapOnMove = (offset: number) => {
    const threshold = 0.1 - 0.01 * $scale;

    if (Math.abs(offset - $time) < threshold) return $time;
    if (Math.abs(offset + getClipDuration(clip) - $time) < threshold)
      return $time - getClipDuration(clip);

    const clips = clip.media.type === "audio" ? $audioClips : $videoClips;

    const valid = clips
      .filter((c) => c.uuid !== clip.uuid)
      .map((c) => ({
        clip: c,
        /**
         * The distance from the front of this clip to the back of the moving clip
         *
         *   - - ----------+                 +-----------+
         * eager offset -> | |-- {front} --| | this clip |
         *   - - ----------+                 +-----------+
         */
        front: Math.abs(c.offset - (offset + getClipDuration(clip))),
        /**
         * The distance from the back of this clip to the front of the moving clip
         *
         * +-----------+                +---------- - -
         * | this clip | |-- {back} --| | <- eager offset
         * +-----------+                +---------- - -
         */
        back: Math.abs(offset - getClipEndPos(c)),
      }))
      .filter((c) => c.front < threshold || c.back < threshold);

    if (!valid.length) return offset;

    let nearest = valid.reduce((prev, curr) =>
      prev.front < prev.front || prev.back < curr.back ? prev : curr
    );

    if (nearest.front < nearest.back)
      return nearest.clip.offset - getClipDuration(clip);
    else return getClipEndPos(nearest.clip);
  };

  const snapOnResize = (
    mode: "left" | "right",
    offset: number,
    edge: number
  ) => {
    const threshold = 0.1 - 0.01 * $scale;

    const duration =
      clip.media.duration -
      edge -
      (mode === "left" ? initialTrimValues.end : initialTrimValues.start);

    if (mode === "left") {
      console.log("left", offset, edge, Math.abs(offset - $time), duration);
    } else {
      console.log(
        "right",
        offset,
        edge,
        Math.abs(offset + duration - $time),
        duration
      );
    }

    if (mode === "left" && Math.abs(offset - $time) < threshold) {
      // calculate new start
      let dt = $time - initialTrimValues.offset;
      edge = initialTrimValues.start + dt;

      return [$time, edge];
    } else if (Math.abs(offset + duration - $time) < threshold) {
      return [offset, offset + initialTrimValues.duration - $time];
    }

    return [offset, edge];
  };

  /**
   * Snaps the beginning of the resized clip's start/end to the end of the nearest
   * clip on the left, if within a 0.1s threshold (and vice versa for the end).
   */
  // const snapOnResize = (
  //   snap: number,
  //   offset: number,
  //   initialStart: number
  // ): [number, number] => {
  //   // TODO: fix
  //   // return [snap, offset];

  //   /**
  //    * Edge cases:
  //    *  - within 0.1 threshold, however clip's start/end is under necessary offset
  //    *    to snap
  //    *
  //    * if resize:
  //    *   if left: snap clip start to nearest clip end if within 0.1s
  //    *   if right: snap clip end to nearest clip start if within 0.1s
  //    */

  //   if (resizeMode === "left") {
  //     const clips = $videoClips
  //       .filter((c) => c.uuid !== clip.uuid)
  //       .map((c) => {
  //         const end = c.offset + (c.media.duration - c.start - c.end);
  //         const distance = Math.abs(offset - end);
  //         return { clip: c, distance };
  //       })
  //       .filter((c) => c.distance < 0.05);

  //     if (!clips.length) return [snap, offset];

  //     let nearest = clips.reduce((prev, curr) => {
  //       if (prev.distance < curr.distance) return prev;
  //       return curr;
  //     });

  //     let nsnap =
  //       nearest.clip.offset +
  //       (nearest.clip.media.duration - nearest.clip.start - nearest.clip.end);

  //     // TODO: should remain static
  //     snap = Math.max(0, snap - nearest.distance);

  //     offset =
  //       nearest.clip.offset +
  //       (nearest.clip.media.duration - nearest.clip.start - nearest.clip.end);

  //     return [snap, offset];
  //   } else {
  //     // const clips = $videoClips
  //     //   // filter out current clip
  //     //   .filter((c) => c.uuid !== clip.uuid)
  //     //   // calculate distance from end of clip to beginning of current clip
  //     //   .map((c) => {
  //     //     const start = c.offset;
  //     //     const distance = Math.abs(offset - end);
  //     //     return { clip: c, distance };
  //     //   })
  //     //   .filter((c) => c.distance < 0.1);
  //     return [snap, offset];
  //   }
  // };

  /**
   * Gets the number of clips that partially obstruct the given clip.
   */
  $: coverCount = (() => {
    let start = clip.offset;
    let end = clip.offset + clipLength;

    let arr = clip.media.type === "audio" ? $audioClips : $videoClips;
    return arr.filter((c) => {
      // break if z-index is lower
      if (c.z < clip.z) return false;

      const cStart = c.offset;
      const cEnd = c.offset + (c.media.duration - c.start - c.end);

      // if clip is fully covered by another clip, don't count it
      if (cStart < start && cEnd > end) return true;

      return (cStart > start && cStart < end) || (cEnd > start && cEnd < end);
    }).length;
  })();

  /**
   * An event dispatcher responsible for emitting events related to when a clip
   * is moved.
   */
  const dispatcher = createEventDispatcher<{
    clipMove: {
      uuid: string;
      type: App.MediaType;
    };
  }>();

  /**
   * Dispatches a "clipMove" event whenever the clip is moved.
   */
  $: clip.offset,
    (() => {
      /**
       * FIXME: we need to diff against a non-reactive "lastOffset" variable
       * because the clip object reacts to other changes around the application,
       * and svelte doesn't have perfect fine-grained reactivity yet. this seems
       * fixable with svelte 5 runes.
       */
      if (clip.offset === lastOffset) return;
      lastOffset = clip.offset;
      dispatcher("clipMove", {
        uuid: clip.uuid,
        type: clip.media.type,
      });
    })();
</script>

<svelte:window
  on:mousemove={(e) => {
    if (canMoveClip) moveClip(e);
    if (resizeMode) resizeClip(e);
  }}
  on:mouseup={() => {
    canMoveClip = false;
    resizeMode = null;
  }}
/>

<button
  class="absolute h-12 border border-zinc-800 rounded-md bg-zinc-300 min-w-2 shadow-sm dark:bg-zinc-800"
  class:bg-zinc-400={selectedUUID === clip.uuid}
  class:dark:bg-zinc-900={selectedUUID === clip.uuid}
  class:shadow-lg={selectedUUID === clip.uuid}
  class:rounded-bl-none={coverCount > 0}
  style:transform
  style:width
  style:z-index={clip.z}
  bind:this={clipEl}
  on:mousedown|stopPropagation={(e) => {
    canMoveClip = true;
    if (clip.media.type === "audio")
      clip.z = $audioClips.reduce((acc, clip) => Math.max(acc, clip.z), 0) + 1;
    else
      clip.z = $videoClips.reduce((acc, clip) => Math.max(acc, clip.z), 0) + 1;
    moveOffset = e.clientX - clipEl.getBoundingClientRect().left;
  }}
  on:dblclick|stopPropagation={() => {
    if (settingsOpen) return;
    $time = clip.offset;
  }}
  on:click|stopPropagation={() => {
    $selected = [clip.uuid, clip.media.type];
  }}
  on:keydown|stopPropagation={(e) => {
    if (e.key === "Delete" && selectedUUID === clip.uuid) {
      $selected = null;
      if (clip.media.type === "audio")
        $audioClips = $audioClips.filter((c) => c.uuid !== clip.uuid);
      else $videoClips = $videoClips.filter((c) => c.uuid !== clip.uuid);
    }
  }}
  on:click
>
  <button
    class="w-[6px] absolute h-full border-none rounded-l-md cursor-ew-resize bg-zinc-900 left-0 top-0"
    class:dark:bg-zinc-950={selectedUUID === clip.uuid}
    class:rounded-bl-none={coverCount > 0}
    on:mousedown|capture|stopPropagation={(e) => {
      resizeMode = "left";
      initialResizeMousePos = e.clientX;
      initialTrimValues.start = clip.start;
      initialTrimValues.offset = clip.offset;
      initialTrimValues.duration = clip.media.duration;
    }}
  ></button>
  <main class="w-full overflow-hidden select-none">
    <p>{clip.media.title}</p>
  </main>
  <button
    class="w-[6px] absolute h-full border-none rounded-r-md cursor-ew-resize bg-zinc-900 right-0 top-0"
    class:dark:bg-zinc-950={selectedUUID === clip.uuid}
    on:mousedown|capture|stopPropagation={(e) => {
      resizeMode = "right";
      initialResizeMousePos = e.clientX;
      initialTrimValues.end = clip.end;
      initialTrimValues.offset = clip.offset;
      initialTrimValues.duration = clip.media.duration;
    }}
  ></button>
  {#if coverCount > 0}
    <div
      style:height="{coverCount * 0.5}rem"
      class="absolute top-full left-0 w-4 bg-zinc-300 rounded-b-md dark:bg-zinc-800"
      class:bg-gray-400={selectedUUID === clip.uuid}
    />
  {/if}
</button>
