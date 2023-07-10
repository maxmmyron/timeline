<script>

    let y = {
        ref: null,
        pos: {x: 0, y: 0}
    };

    let x = {
        ref: null,
        pos: {x: 0, y: 0}
    }

    // @ts-ignore
    x.ref = y;
    // @ts-ignore
    y.ref = x;

    const handleMove = () => {
        x.pos.x += 10;

        x.ref.pos = x.pos;
    }

</script>

<button on:click={handleMove}>move</button>

<div style="transform: translate({x.pos.x}px, {x.pos.y}px); background:red;">X</div>
<div style="transform: translate({y.pos.x}px, {y.pos.y}px); background: blue;">Y</div>

<style>
    div {
        width: 100px;
        height: 100px;
    }
</style>