<script lang="ts">
  import { audioClips, videoClips, uploaded } from "$lib/stores";
  import { createClip, getClipEndPos } from "$lib/utils";
  import { createMediaFromBlob, createMediaFromFile } from "$lib/loader";
  import IconButton from "../IconButton.svelte";
  import { convert } from "video-to-audio";

  const upload = async (fileList: FileList) => {
    for (const file of fileList) {
      $uploaded = [...$uploaded, createMediaFromFile(file)];
    }
  };

  const addClip = async (media: App.Media) => {
    if (media.type === "video") {
      let videoData = await fetch(media.src).then((res) => res.text());
      const { data } = await (convert(videoData, "mp3") as Promise<{
        name: string;
        data: string;
        format: string;
      }>);

      let audioData = await fetch(data).then((res) => res.blob());
      const audioMedia = createMediaFromBlob(audioData, media.title);

      const audioClip = createClip(await audioMedia.media);
      const videoClip = createClip(media);

      $audioClips = [...$audioClips, audioClip as App.Clip<"audio">];
      $videoClips = [...$videoClips, videoClip as App.Clip<"video">];

      return;
    }

    const clip = createClip(media);

    if (media.type === "audio") {
      $audioClips = [...$audioClips, clip as App.Clip<"audio">];
    } else {
      $videoClips = [
        ...$videoClips,
        clip as App.Clip<"video"> | App.Clip<"image">,
      ];
    }
  };

  export let removeMedia = (uuid: string) => {
    // TODO: add confirmation dialog
    if ($videoClips.find((c) => c.media.uuid === uuid))
      $videoClips = $videoClips.filter((c) => c.media.uuid !== uuid);
    else if ($audioClips.find((c) => c.media.uuid === uuid))
      $audioClips = $audioClips.filter((c) => c.media.uuid !== uuid);

    $uploaded = $uploaded.filter((m) => m.uuid !== uuid);
  };
</script>

<div class="flex flex-col gap-2 p-2 h-full overflow-hidden">
  <label for="upload">
    <!-- TODO: fix exact import types -->
    <input
      id="upload"
      class="hidden"
      type="file"
      accept="video/*,audio/*,image/*"
      multiple
      on:change={(e) => e.currentTarget.files && upload(e.currentTarget.files)}
    />
    <IconButton
      name="Import"
      alt="Upload to Media Pool"
      showOutline
      class="w-6 h-6 pointer-events-none"
      icon="import"
    />
  </label>
  <hr />
  <div class="h-full flex-grow flex flex-col gap-1 overflow-hidden">
    {#if $uploaded.length === 0}
      <p>No media uploaded</p>
    {/if}
    <div
      class="flex-grow flex flex-col gap-1 h-full overflow-scroll [scrollbar-width:thin]"
    >
      {#each $uploaded as { uuid, title, media } (uuid)}
        <article
          class="p-2 rounded-md border dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 flex gap-2 items-center justify-between"
        >
          <header class="flex flex-col gap-2 min-w-0">
            <p class="text-ellipsis overflow-hidden whitespace-nowrap">
              {title}
            </p>
            {#await media}
              <p>Loading...</p>
            {:then media}
              <p>
                {#if media.type !== "image"}
                  <span>
                    <!-- FIXME: type-error here despite removing image type -->
                    {media.duration.toPrecision(3)}s -
                  </span>
                {/if}
                {media.type}
              </p>
            {/await}
          </header>
          <div class="flex flex-col gap-2">
            {#await media then media}
              <button
                on:click={() => addClip(media)}
                class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
              >
                +
              </button>
              <button
                on:click={() => removeMedia(uuid)}
                class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
              >
                ×
              </button>
            {:catch}
              <button
                on:click={() => removeMedia(uuid)}
                class="bg-zinc-800 p-1 w-5 h-5 rounded-md shadow-md flex items-center justify-center border border-zinc-700"
              >
                ×
              </button>
            {/await}
          </div>
        </article>
      {/each}
    </div>
  </div>
</div>
