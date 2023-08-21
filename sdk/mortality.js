async function obtainMortalityData(){

    const data = await (await fetch("https://data.cdc.gov/resource/3yf8-kanr.json")).json();
    return data;

}

export{
    obtainMortalityData
}