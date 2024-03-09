<script lang="ts">
  import { audioClips, videoClips, uploaded } from "$lib/stores";
  import { createClip, getClipEndPos } from "$lib/utils";
  import Region from "./Region.svelte";
  import { resolveMedia } from "$lib/loader";
  import IconButton from "./IconButton.svelte";

  const upload = async (fileList: FileList) => {
    for (const file of fileList) {
      // const hash = cyrb53((await file.arrayBuffer).toString());
      // console.log("Uploading", file.name, "with hash", hash);
      // if (uploadedHashes.includes(hash)) continue;
      // else uploadedHashes = [...uploadedHashes, hash];

      $uploaded = [...$uploaded, resolveMedia(file)];
    }
  };

  export let removeMedia = (uuid: string) => {
    $uploaded = $uploaded.filter((m) => m.uuid !== uuid);
  };
</script>

<Region
  class="flex flex-col gap-1 row-start-1 h-full border-none !bg-transparent"
  on:drop={(e) => e.dataTransfer?.files && upload(e.dataTransfer.files)}
>
  <label for="upload">
    <input
      id="upload"
      class="hidden"
      type="file"
      accept="video/mp4,audio/mp3,image/png,image/jpeg"
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
            <p>{media.duration.toPrecision(3)}s - {media.type}</p>
          {/await}
        </header>
        <div class="flex flex-col gap-2">
          {#await media then media}
            <button
              on:click={() => {
                const clip = createClip(media);
                const end = getClipEndPos(clip);
                if (media.type === "audio") {
                  $audioClips = [...$audioClips, clip];
                } else $videoClips = [...$videoClips, clip];

                // updateScrubberAndScroll(end);
              }}
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
</Region>
