<script lang="ts">
  import { TIME_SCALING } from "./stores";

  export let clip: Clip;

  $: transform = `translateX(${clip.offset * TIME_SCALING}px)`;
  $: width = `${clip.media.duration * TIME_SCALING}px`;
</script>

<button
  style:transform
  style:width
  style:z-index={clip.z}
  on:click
  on:mousedown
>
  <p>{clip.uuid}, {clip.z}</p>
  <p>{clip.media.title}</p>
</button>

<style>
  button {
    cursor: pointer;
    position: absolute;
    /* border: 1px solid rgb(71, 178, 142); */
    border: none;
    height: 100%;
    border-radius: 12px;
    background-color: aquamarine;
  }

  button > p {
    margin: 0;
  }
</style>
