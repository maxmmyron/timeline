<script lang="ts">
  export let file: App.Media;
</script>

<article>
  <header>
    <p>{file.title}</p>
    <p>{file.duration}s</p>
  </header>
  <button on:click>add</button>
</article>

<style>
  article {
    border: 1px solid gray;
    padding: 1rem;
    display: flex;
    gap: 1rem;
  }
  header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  header > p {
    margin: 0;
  }
  header > p:first-child {
    font-weight: bold;
  }
</style>
