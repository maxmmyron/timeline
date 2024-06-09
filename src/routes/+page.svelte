<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    time,
    videoClips,
    playerScale,
    safeRes,
    selected,
    paused,
    audioClips,
    vRefs,
    aRefs,
    aCtx,
  } from "$lib/stores";
  import TimelineRibbon from "$lib/components/TimelineRibbon/TimelineRibbon.svelte";
  import Timeline from "$lib/components/Timeline/Timeline.svelte";
  import InspectorPanel from "$lib/components/Panel/InspectorPanel.svelte";
  import { frame, getCurrentClips } from "$lib/utils";
  import MediaPanel from "$lib/components/Panel/MediaPanel.svelte";
  import TimelineMedia from "$lib/components/TimelineMedia.svelte";
  import PreferencesPanel from "$lib/components/Panel/PreferencesPanel.svelte";
  import VolumeMeter from "$lib/components/VolumeMeter.svelte";
  import Panel from "$lib/components/Panel/Panel.svelte";
  import ExportPanel from "$lib/components/Panel/ExportPanel.svelte";

  // get the UUIDs of the current audio clips (we return this as a comma-sep
  // string to prevent reactivity issues) FIXME: THIS KIND OF SUCKS ASS
  $: _videoUUIDs = getCurrentClips($videoClips, $time);
  $: videoUUIDs = _videoUUIDs ? _videoUUIDs.split(",") : null;

  $: _audioUUIDs = getCurrentClips($audioClips, $time);
  $: audioUUIDs = _audioUUIDs ? _audioUUIDs.split(",") : null;

  $: currVideo = $videoClips.filter(
    (v) => videoUUIDs?.includes(v.uuid) ?? false
  );

  $: currAudio = $audioClips.filter(
    (c) => audioUUIDs?.includes(c.uuid) ?? false
  );

  // Pause video/audio if able to
  $: if ($paused)
    (async () => {
      await $aCtx!.suspend();
      for (const { uuid } of $videoClips) $vRefs[uuid]?.pause();
      for (const { uuid } of $audioClips) $aRefs[uuid]?.pause();
    })();
  $: if (!$paused)
    (async () => {
      await $aCtx!.resume();
      if (videoUUIDs) for (const uuid of videoUUIDs) $vRefs[uuid]?.play();
      if (audioUUIDs) for (const uuid of audioUUIDs) $aRefs[uuid]?.play();
    })();

  // update video/audio playback when video/audio/time changes
  $: $time, updatePlayback("video", currVideo);
  $: $time, updatePlayback("audio", currAudio);

  // reset video/audio time when currently playing UUIDs change
  $: resetPlayback("video", videoUUIDs);
  $: resetPlayback("audio", audioUUIDs);

  let containerHeight: number = 1;
  let containerWidth: number = 1;

  $: if ($safeRes[0] / $safeRes[1] < containerWidth / containerHeight) {
    $playerScale = containerHeight / $safeRes[1] / 1.5;
  } else {
    $playerScale = containerWidth / $safeRes[0] / 1.5;
  }

  /**
   * Iterates through the UUIDs of the specified type, and updates the playback
   * status accordingly as new clips enter the current time.
   *
   * @param type
   * @param clips This is included as a parameter to leverage reactive labeling
   */
  const updatePlayback = async (type: App.MediaType, curr: App.Clip[]) => {
    await tick();

    const clips = type !== "audio" ? $videoClips : $audioClips;
    const refs = type !== "audio" ? $vRefs : $aRefs;

    // if there's no audio to play or no current clip, we can return early.
    if (!clips) return;

    for (const { uuid } of clips) {
      const el = refs[uuid];
      const clip = curr.find((c) => c.uuid === uuid);

      // if there's no el, continue
      if (!el) continue;

      // if there's no clip, pause the corresponding media element and continue
      if (!clip) {
        el.pause();
        continue;
      }

      // if we're paused, we can just set the current time of the media element
      if ($paused) {
        el.currentTime = Math.max(
          0,
          Math.min(
            clip.media.duration - clip.end,
            $time - clip.offset + clip.start
          )
        );
      } else {
        // if we're not paused, there's a media element, that media element is
        // paused, AND the corresponding clip is in the "currently playing" array,
        // then play the media element
        if (el.paused) el.play();
      }
    }
  };

  /**
   * Resets the playback of all current clips. This is run when the scrubber is
   * moved, or when the current video/audio UUIDs change.
   *
   * @param type
   * @param uuids This is included as a parameter to leverage reactive labeling
   */
  const resetPlayback = async (type: App.MediaType, uuids: string[] | null) => {
    await tick();

    const refs = type !== "audio" ? $vRefs : $aRefs;
    const curr = type !== "audio" ? currVideo : currAudio;

    if (!uuids) return;
    for (const uuid of uuids) resetClipPlayback(refs, curr, uuid);
  };

  /**
   * Resets the playback of a clip, given its UUID. This is run for every clip
   * when the scrubber is moved or when the current video/audio UUIDs change.
   * This is individually run for a given when when that clip's offset changes
   * (by way of a clipMove event).
   *
   * @param refs the string/refs Record to use
   * @param curr the current clip array to use
   * @param uuid
   */
  const resetClipPlayback = (
    refs: Record<string, HTMLMediaElement>,
    curr: App.Clip[],
    uuid: string
  ) => {
    const el = refs[uuid];
    const clip = curr.find((c) => c.uuid === uuid);

    if (!el || !clip) return;

    el.currentTime = Math.max(
      0,
      Math.min(clip.media.duration - clip.end, $time - clip.offset + clip.start)
    );
  };

  onMount(() => requestAnimationFrame(frame));

  let currentPanel: string;
</script>

<Panel panels={["Media Browser"]} bg="bg-zinc-925">
  <MediaPanel />
</Panel>

<Panel
  panels={["Preview", "Node Editor", "Export", "Preferences"]}
  bind:currentPanel
>
  {#if currentPanel === "Preview"}
    <div
      class="overflow-hidden flex items-center justify-center w-full h-full gap-2"
      bind:clientHeight={containerHeight}
      bind:clientWidth={containerWidth}
    >
      <div
        class="relative overflow-hidden bg-black"
        style:width="{$safeRes[0] * $playerScale}px"
        style:height="{$safeRes[1] * $playerScale}px"
      >
        {#each $videoClips as clip (clip.uuid)}
          <TimelineMedia {clip} curr={currVideo} />
        {/each}
        {#each $audioClips as clip (clip.uuid)}
          <TimelineMedia {clip} />
        {/each}
      </div>
    </div>
  {:else if currentPanel === "Node Editor"}
    <div class="flex items-center justify-center w-full h-full">
      <p>coming soon...</p>
    </div>
  {:else if currentPanel === "Export"}
    <ExportPanel />
  {:else if currentPanel === "Preferences"}
    <PreferencesPanel />
  {/if}
</Panel>

<Panel panels={["Media Inspector"]} bg="bg-zinc-925">
  {#if $selected}
    <InspectorPanel uuid={$selected[0]} type={$selected[1]} />
  {:else}
    <div class="w-full h-full flex items-center justify-center">
      <p>No clip selected</p>
    </div>
  {/if}
</Panel>

<div
  class="relative col-start-1 row-start-2 col-span-full grid gap-0.5 grid-cols-[1fr,4rem] grid-rows-1"
>
  <div class="flex flex-col">
    <TimelineRibbon />

    <!-- Update the currentTime property of the current video playing when either
  the scrubber moves, or the current video's offset is changed (via drag) -->
    <Timeline
      on:scrubberMove={() => {
        resetPlayback("video", videoUUIDs);
        resetPlayback("audio", audioUUIDs);
      }}
      on:clipMove={(e) => {
        if (e.detail.type === "video" || e.detail.type === "image")
          resetClipPlayback($vRefs, currVideo, e.detail.uuid);
        else resetClipPlayback($aRefs, currAudio, e.detail.uuid);
      }}
    />
  </div>

  <VolumeMeter />
</div>
