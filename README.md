This is a Foundry VTT game system for Sword Chronicle,  based on the excellent Boilerplate system. This is now in a fully playable state, but it is likely to get continued updates as the UI is a mess and there's almost certainly some bugs. This has Compendium content for all published books. 

I understand that this is also likely a working sheet for the Song of Ice and Fire Roleplaying System, but I have not verified this. If someone tests this, please contact me and I can improve official support.  


If you are having difficulty with this system, please open a Github issue. I am semi-active on the Foundry discord, so I am not likely to see issues there. 

Please note that there is an optional Stunt system that's not part of the core rules that is disabled by default. Players will need to refresh the page to see the results if this is enabled or disabled.  

 

Known issues:
1. Destiny Points are not automatically spent or gained when applying Qualities or Drawbacks using Compendium items. 
2. Sprint movement for drag purposes will not calculate correctly if using the ShowDragDistance module.



This has full support for both social and physical combat. To switch initative calculation between modes, go into Game Settings -> System Settings and switch mode, or use the following script macro as a GM:

```
var current=game.settings.get("swordschronicles","initiativeType");
var content="Setting game mode to ";
if(current=="combat"){
game.settings.set("swordschronicles","initiativeType","social");
content+="social combat";
}else{
game.settings.set("swordschronicles","initiativeType","combat");
content+="physical combat";
}
var chat= {
user: game.user._id,
speaker: ChatMessage.getSpeaker(),
content: content};
ChatMessage.create(chat,{});
```


Install URL: 
https://github.com/caffyn/FoundryVTTSwordsChronicles/raw/main/system.json 
