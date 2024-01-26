<script lang="ts">
  import { scale, videoClips, time, selected, audioClips } from "$lib/stores";
  import { createClip, getCurrentClips } from "$lib/utils";
  import Region from "../Region.svelte";
  import Runtime from "../Runtime.svelte";

  const decrease = () => {
    $scale = Math.max(0.02, $scale - 0.25);
  };

  const increase = () => {
    $scale = Math.min(5, $scale + 0.25);
  };

  const slice = (type: "video" | "audio", clips: App.Clip[]) => {
    if (!$selected) return;
    if ($selected[1] !== type) return;

    const clip = clips.find((c) => c.uuid === $selected![0]) as App.Clip;

    // if the time is outside the clip, do nothing
    if ($time < clip.offset || $time > clip.offset + clip.media.duration)
      return;

    let timeOffset = $time - clip.offset;
    let clipDuration = clip.media.duration - clip.start - clip.end;

    const leftClip = createClip(
      { ...clip.media },
      {
        offset: clip.offset,
        start: clip.start,
        end: clip.end + (clipDuration - timeOffset),
        matrix: [...clip.matrix],
      }
    );

    const rightClip = createClip(
      { ...clip.media },
      {
        offset: clip.offset + timeOffset,
        start: clip.start + timeOffset,
        end: clip.end,
        matrix: [...clip.matrix],
      }
    );

    clips = [...clips, leftClip, rightClip];
    const oldUUID = $selected[0];
    $selected = null;
    clips = clips.filter((c) => c.uuid !== oldUUID);

    // update stores to reflect changes
    if (type === "video") $videoClips = clips;
    else $audioClips = clips;
  };
</script>

<svelte:window
  on:keydown={(e) => {
    // ctrl shift + or -: zoom in or out
    if (e.ctrlKey && e.altKey && e.key === "=") {
      e.preventDefault();
      increase();
    } else if (e.ctrlKey && e.altKey && e.key === "-") {
      e.preventDefault();
      decrease();
    } else if (e.ctrlKey && e.altKey && e.key === "0") {
      e.preventDefault();
      $scale = 1;
    }
  }}
/>

<Region
  class="grid place-items-center grid-cols-3 gap-2 lg:col-start-1 lg:col-span-full lg:row-start-3 lg:row-span-1"
>
  <div class="flex gap-2">
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700 disabled:brightness-50 disabled:cursor-not-allowed disabled:shadow-none"
      disabled={!$selected || $selected[1] !== "video"}
      on:click={() => slice("video", $videoClips)}>slice vid</button
    >
    <button
      class="bg-zinc-800 p-1 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700 disabled:brightness-50 disabled:cursor-not-allowed disabled:shadow-none"
      disabled={!$selected || $selected[1] !== "audio"}
      on:click={() => slice("audio", $audioClips)}>slice aud</button
    >
  </div>
  <label class="flex gap-1">
    <button
      class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      on:click={decrease}
    >
      <span>-</span>
    </button>
    <input type="range" min="0.02" max="5" step="0.001" bind:value={$scale} />
    <button
      class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
      on:click={increase}
    >
      <span>+</span>
    </button>
  </label>
  <Runtime time={$time} />
</Region>
