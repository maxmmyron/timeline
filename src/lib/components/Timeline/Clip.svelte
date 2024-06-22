<script lang="ts">
  import {
    scaleFactor,
    videoClips,
    time,
    selected,
    scroll,
    audioClips,
    scale,
    pointerMode,
  } from "$lib/stores";
  import { getClipDuration, getClipEndPos } from "$lib/utils";
  import { createEventDispatcher, onMount } from "svelte";

  onMount(() => {
    // on unmount, deselect the clip if it is selected.
    return () => {
      if ($selected && clip.uuid === $selected[0]) $selected = null;
    };
  });

  type ResizeMode = "left" | "right";

  export let clip: App.Clip;
  // this is set to 9 as a dirty default
  export let timelineOffset: number;

  $: selectedUUID = $selected ? $selected[0] : null;

  let canMoveClip = false;
  let resizeMode: ResizeMode | null = null;

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

  /**
   * Initial values of clip when resizing, so resize calculates don't resize
   * based on recently updated start/end/offset values
   */
  let initial = { start: 0, end: 0, offset: 0, duration: 0, x: 0 };

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
    const dt = (e.clientX - initial.x) / $scaleFactor;

    let offset, start, end, duration;

    // if we're working with an image, there's a few special rules we need to
    // follow. in particular, images don't use the start and end properties;
    // rather, they solely use offset and duration. likewise, images don't have
    // defined durations, which means it can change!
    if (clip.media.type === "image") {
      const threshold = 0.1 - 0.01 * $scale;

      // if we're resizing the left side of the clip, we need to change the
      // offset and duration of the clip
      if (resizeMode === "left") {
        offset = Math.max(0, initial.offset + dt);
        duration = Math.max(0, initial.duration - dt);

        if (!e.shiftKey && Math.abs(offset - $time) < threshold) {
          offset = $time;
          duration = initial.duration - ($time - initial.offset);
        }

        clip.offset = offset;
        // FIXME: if clip offset moved < 0, overall duration will begin to
        // increase (i.e. end of clip moves)
        clip.media.duration = duration;
      }
      // if we're resizing the right side of the clip, we need to change the
      // duration of the clip
      else if (resizeMode === "right") {
        duration = Math.max(0, initial.duration + dt);

        const dist = Math.abs(duration - ($time - initial.offset));
        if (!e.shiftKey && dist < threshold) {
          duration = $time - initial.offset;
        }
        clip.media.duration = duration;
      }
      return;
    }

    // we're otherwise working with an audio or video clip. these have defined
    // durations which are static, and their bounds are defined by start and end
    // properties.
    let snap: [number, number];
    if (resizeMode === "left") {
      start = Math.min(
        Math.max(0, initial.start + dt),
        clip.media.duration - clip.end
      );

      offset = Math.max(initial.offset - initial.start, initial.offset + dt);

      if (e.shiftKey) snap = [offset, start];
      else snap = snapOnResize("left", offset, start);

      clip.offset = snap[0];
      clip.start = snap[1];
    } else if (resizeMode === "right") {
      end = Math.min(
        Math.max(0, initial.end - dt),
        clip.media.duration - clip.start
      );

      if (e.shiftKey) snap = [initial.offset, end];
      else snap = snapOnResize("right", initial.offset, end);

      clip.offset = snap[0];
      clip.end = snap[1];
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
    mode: ResizeMode,
    offset: number,
    edge: number
  ): [number, number] => {
    const threshold = 0.1 - 0.01 * $scale;
    const { start, end, duration } = initial;
    const dur = clip.media.duration - edge - (mode === "left" ? end : start);

    if (mode === "left" && Math.abs(offset - $time) < threshold) {
      console.log("snap left", offset, start + $time - initial.offset);
      return [$time, start + $time - initial.offset];
    } else if (Math.abs(offset + dur - $time) < threshold) {
      console.log("snap right", offset, end + $time - initial.offset);
      return [offset, offset + (duration - start - end) - $time];
    }

    console.log("no snap", offset, edge);
    return [offset, edge];
  };

  /**
   * Gets the number of clips that partially obstruct the given clip.
   */
  $: coverCount = (() => {
    let start = clip.offset;
    let end = clip.offset + clipLength;

    let arr = clip.media.type === "audio" ? $audioClips : $videoClips;
    return arr.filter((c) => {
      // break if z-index is lower
      if (c.timelineZ < clip.timelineZ) return false;

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

  const setInitialValues = (x: number) => {
    initial.start = clip.start;
    initial.end = clip.end;
    initial.offset = clip.offset;
    initial.duration = clip.media.duration;
    initial.x = x;
  };

  const slice = (splitTime: number) => {
    let clips = clip.media.type === "audio" ? $audioClips : $videoClips;

    // if the time is outside the clip, do nothing
    // if (
    //   splitTime < clip.offset ||
    //   splitTime > clip.offset + clip.media.duration
    // )
    //   return;

    let splitOffset = splitTime - clip.offset;
    let clipDuration = clip.media.duration - clip.start - clip.end;

    let leftClip = structuredClone(clip);
    let rightClip = structuredClone(clip);

    leftClip.end = clip.end + (clipDuration - splitOffset);

    rightClip.offset = clip.offset + splitOffset;
    rightClip.start = clip.start + splitOffset;

    const oldUUID = clip.uuid;
    $selected = null;

    if (clip.type === "video" || clip.type === "image") {
      clips = [...clips, leftClip, rightClip] as (
        | App.VideoClip
        | App.ImageClip
      )[];
      clips = clips.filter((c) => c.uuid !== oldUUID);
      $videoClips = clips;
    } else {
      clips = [...clips, leftClip, rightClip] as App.AudioClip[];
      clips = clips.filter((c) => c.uuid !== oldUUID);
      $audioClips = clips;
    }
  };
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
  class="absolute h-9 border border-zinc-800 rounded-md bg-zinc-300 min-w-2 shadow-md dark:bg-zinc-800"
  class:cursor-text={$pointerMode === "slice"}
  class:bg-zinc-400={selectedUUID === clip.uuid}
  class:dark:bg-zinc-900={selectedUUID === clip.uuid}
  class:shadow-lg={selectedUUID === clip.uuid}
  class:rounded-bl-none={coverCount > 0}
  style:transform
  style:width
  style:z-index={clip.timelineZ}
  bind:this={clipEl}
  on:mousedown|stopPropagation={(e) => {
    if ($pointerMode === "slice") {
      slice((e.clientX - timelineOffset + $scroll) / $scaleFactor);
      $pointerMode = "select";
      return;
    }
    canMoveClip = true;
    if (clip.media.type === "audio")
      clip.timelineZ =
        $audioClips.reduce((acc, clip) => Math.max(acc, clip.timelineZ), 0) + 1;
    else
      clip.timelineZ =
        $videoClips.reduce((acc, clip) => Math.max(acc, clip.timelineZ), 0) + 1;
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
      if (clip.media.type === "audio")
        $audioClips = $audioClips.filter((c) => c.uuid !== clip.uuid);
      else $videoClips = $videoClips.filter((c) => c.uuid !== clip.uuid);
    }
  }}
  on:click
>
  <button
    class="w-[6px] absolute h-full border-none rounded-l-md cursor-ew-resize bg-zinc-400 dark:bg-zinc-900 left-0 top-0 flex items-center justify-center"
    class:bg-zinc-500={selectedUUID === clip.uuid}
    class:dark:bg-zinc-950={selectedUUID === clip.uuid}
    class:rounded-bl-none={coverCount > 0}
    on:mousedown|capture|stopPropagation={(e) => {
      resizeMode = "left";
      setInitialValues(e.clientX);
    }}
  >
    <div class="h-3/5 w-[1px] bg-zinc-300 dark:bg-zinc-800" />
  </button>
  <main class="w-full overflow-hidden select-none">
    <p>{clip.media.title}</p>
  </main>
  <button
    class="w-[6px] absolute h-full border-none rounded-r-md cursor-ew-resize bg-zinc-400 dark:bg-zinc-900 right-0 top-0 flex items-center justify-center"
    class:bg-zinc-500={selectedUUID === clip.uuid}
    class:dark:bg-zinc-950={selectedUUID === clip.uuid}
    on:mousedown|capture|stopPropagation={(e) => {
      resizeMode = "right";
      setInitialValues(e.clientX);
    }}><div class="h-3/5 w-[1px] bg-zinc-300 dark:bg-zinc-800" /></button
  >
  {#if coverCount > 0}
    <div
      style:height="{coverCount * 0.5}rem"
      class="absolute top-full left-0 w-4 bg-zinc-300 rounded-b-md dark:bg-zinc-800"
      class:bg-gray-400={selectedUUID === clip.uuid}
    />
  {/if}
</button>
