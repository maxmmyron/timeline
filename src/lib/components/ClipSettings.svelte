<script lang="ts">
  export let clip: App.Clip;
  export let settingsOpen = false;

  let settingsContainer: HTMLElement;

  const checkWindowClose = (e: MouseEvent) => {
    if (settingsOpen && !settingsContainer.contains(e.currentTarget as Node)) {
      settingsOpen = false;
    }
  };
</script>

<svelte:window on:click={checkWindowClose} />

{#if settingsOpen}
  <article class="settings-container" bind:this={settingsContainer}>
    <button on:click={() => (settingsOpen = false)}>close</button>
    <label class="setting">
      <p>Scale X</p>
      <input />
    </label>
    <label class="setting">
      <input />
    </label>

    <input />
    <input />
  </article>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    width: 100vw;
    height: 100vh;
    background: rgba(0 0 0 / 0.5);
  }
</style>
