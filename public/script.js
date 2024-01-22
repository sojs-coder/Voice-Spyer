var chartData = {
    labels: [],
    datasets: [{
        label: 'Interests',
        data: [0,0,0,0],
        backgroundColor: [
        ]
    }]
}

function addLabel(label, color) {
    chartData.labels.push(label);
    chartData.datasets[0].backgroundColor.push(color);
}
function updateInterest(interest, impact) {
    if(!chartData.labels.includes(interest)){
        addLabel(interest, `#${Math.floor(Math.random()*16777215).toString(16)}`);
    }
    chartData.datasets[0].data[chartData.labels.indexOf(interest)] = impact;
}
const chart = new Chart(document.getElementById('chart'), {
    type: 'doughnut',
    data: chartData,
});

async function checkInterests() {
    const res = await fetch("/interests", {
        method: "GET",
    });

    const data = await res.json();
    var rto = document.getElementById("results");
    rto.style.width = (window.innerWidth * 2/4) + "px";
    chart.resize();
    var interests = data.interests;
    interests = interests.sort((a, b) => b.impact - a.impact);
    // calculate standard deviation of interests impact
    function stdev(arr){
        var mean = arr.reduce((a,b)=>a+b,0)/arr.length;
        return Math.sqrt(arr.map(x=>Math.pow(x-mean,2)).reduce((a,b)=>a+b,0)/arr.length);
    }
    var std = stdev(interests.map(i => i.impact));
    // filter out anything - 1 standard deviation
    interests = interests.filter(i => i.impact > std);

    interests.forEach((interest) => {
        var interestName = interest.interestName;
        var impact = interest.impact;
        updateInterest(interestName, impact);
    });
    chart.update();
}

setInterval(checkInterests, 1000);

if (annyang) {
    var commands = {
        '*catchAll': catchAll
    };

    annyang.addCommands(commands);

    annyang.start();
}

async function catchAll(caught){
    console.log("caught", caught)
    var interests = {}
    var caughtArr = caught.split(" ");

    for(let word of caughtArr){
        word = word.toLowerCase();
        var part = await fetch(`/partofspeech?word=${word}`);
        var partData = await part.json();
        console.log(partData)
        var partOfSpeech = partData[0].tag;

        if(partOfSpeech.startsWith("NN")){
            console.log("noun", word)
            if(!interests[word]){
                interests[word] = 0;
            }
            interests[word]++;
            console.log(interests)
        }
    }

    var fInterests = [];
    for (var key in interests) {
        fInterests.push({
            interestName: key,
            impact: interests[key]
        });
    }

    if(fInterests.length > 0) {
        sendInterests(fInterests);
    }

}

function sendInterests(interests) {
    fetch("/interests", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            interests: interests
        })
    });
    console.log("send", interests)
}