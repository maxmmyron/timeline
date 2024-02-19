<script lang="ts">
  import { aCtx, iRefs, vRefs, aRefs, playerScale, time } from "$lib/stores";
  import { lerpAutomation } from "$lib/utils";
  import { onMount } from "svelte";

  export let clip: App.Clip;

  export let curr: App.Clip[] = [];

  let sourceNode: MediaElementAudioSourceNode;
  let gainNode: GainNode = $aCtx!.createGain();
  let panNode: StereoPannerNode = $aCtx!.createStereoPanner();

  $: gainNode.gain.value = lerpAutomation(clip.volume, clip.offset, $time);
  $: panNode.pan.value = clip.pan;

  $: scaleX = lerpAutomation(clip.matrix[0], clip.offset, $time);
  $: scaleY = lerpAutomation(clip.matrix[3], clip.offset, $time);
  $: translateX = lerpAutomation(clip.matrix[4], clip.offset, $time);
  $: translateY = lerpAutomation(clip.matrix[5], clip.offset, $time);

  $: lerpedMatrix = [scaleX, 0, 0, scaleY, translateX, translateY];

  onMount(() => {
    if (clip.media.type === "image") {
      return;
    }

    if (clip.media.type === "video") {
      sourceNode = $aCtx!.createMediaElementSource($vRefs[clip.uuid]);
    } else {
      sourceNode = $aCtx!.createMediaElementSource($aRefs[clip.uuid]);
    }

    sourceNode.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect($aCtx!.destination);

    return () => {
      sourceNode.disconnect();
      gainNode.disconnect();
      panNode.disconnect();
    };
  });
</script>

{#if clip.media.type === "video"}
  <video
    class="absolute top-1/2 left-1/2 max-w-none"
    src={clip.media.src}
    title={clip.uuid}
    bind:this={$vRefs[clip.uuid]}
    style:transform="translate(-50%, -50%) matrix({lerpedMatrix.join(",")})"
    style:transform-origin="{clip.origin[0] * 100}% {clip.origin[1] * 100}%"
    style:z-index={clip.z}
    class:hidden={curr.findIndex((c) => c.uuid === clip.uuid) === -1}
    preload=""
  >
    <track kind="captions" />
  </video>
  <!-- <div class="absolute top-1/2 left-1/2 w-4 h-4 bg-red-500 z-10" />
  <div
    class="absolute top-1/2 left-1/2 w-4 h-4 bg-blue-400 z-20"
    style="transform: translateX({gainNode.gain.value * 250}px);"
  />
  <div
    class="absolute top-1/2 left-1/2 w-4 h-4 bg-green-400 transform translate-x-[250px] z-10"
  /> -->
{:else if clip.media.type === "image"}
  <img
    class="absolute top-1/2 left-1/2 max-w-none"
    src={clip.media.src}
    title={clip.uuid}
    alt=""
    bind:this={$iRefs[clip.uuid]}
    style:transform="translate(-50%, -50%) matrix({lerpedMatrix.join(",")})"
    style:transform-origin="{clip.origin[0] * 100}% {clip.origin[1] * 100}%"
    style:z-index={clip.z}
    class:hidden={curr.findIndex((c) => c.uuid === clip.uuid) === -1}
  />
{:else if clip.media.type === "audio"}
  <audio
    class="hidden"
    src={clip.media.src}
    title={clip.uuid}
    bind:this={$aRefs[clip.uuid]}
  />
{/if}
