<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import AutomationIcon from "$lib/icon/AutomationIcon.svelte";
  import AutomationPanel from "./AutomationPanel.svelte";

  export let name: string;
  export let scalar: number;
  export let automation: App.Automation | null = null;
  export let defaultVal: number = 0;

  export let useSubgrid: boolean = false;
  export let supportsAutomation: boolean = false;

  /**
   * Whether or not the numerical override input can exceed the bounds defined
   * by the `min` and `max` props.
   */
  export let strictBounds: boolean = false;

  // TODO: could change to restProps? how?
  export let props: svelteHTML.HTMLProps<
    "input",
    svelteHTML.HTMLAttributes<any>
  > & {
    min: number;
    max: number;
    step: number;
  } = { min: -Infinity, max: Infinity, step: 0.01 };

  /**
   * The magnitude of the change in the scalar value when the mouse wheel is
   * scrolled.
   */
  export let mag: number = props.step;

  const dispatcher = createEventDispatcher<{ change: number }>();
  $: dispatcher("change", scalar);

  let isHovered = false;
  let isAutomationVisible = false;

  let clazz = "";
  export { clazz as class };
</script>

<label
  class="{useSubgrid
    ? 'grid grid-cols-subgrid col-start-1 col-span-full'
    : 'flex gap-2'} items-center {clazz}"
>
  <p class="text-ellipsis">{name}</p>
  <input
    class="border border-zinc-300 rounded-md dark:bg-zinc-900 dark:border-zinc-800 w-10"
    type="number"
    disabled={automation && automation.curves.length > 0}
    {...props}
    {...$$restProps}
    bind:value={scalar}
    alt="Manual {name} property entry"
    on:change={(e) => {
      let parsed = parseFloat(e.currentTarget.value);
      if (strictBounds)
        scalar = Math.min(props.max, Math.max(props.min, parsed));
      else scalar = parsed;
    }}
    on:mouseenter={() => (isHovered = true)}
    on:mouseleave={() => (isHovered = false)}
    on:auxclick={(e) => {
      if (e.button === 1) scalar = defaultVal;
    }}
    on:wheel={(e) => {
      let mult = e.shiftKey ? 10 : 1;
      if (isHovered) {
        e.preventDefault();
        scalar = Math.min(
          props.max,
          Math.max(props.min, scalar - Math.sign(e.deltaY) * mag * mult)
        );
      }
    }}
    on:change
  />
  {#if supportsAutomation && automation}
    <IconButton
      alt="Edit automation"
      on:click={() => {
        isAutomationVisible = true;
      }}
    >
      <AutomationIcon />
    </IconButton>
  {/if}
</label>
{#if isAutomationVisible && automation}
  <div class="{useSubgrid ? 'col-start-1 col-end-5' : ''} w-full">
    <AutomationPanel bind:automation bind:isAutomationVisible />
  </div>
{/if}
