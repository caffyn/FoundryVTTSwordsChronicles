// Import Modules
import { SwordschroniclesActor } from "./actor/actor.js";
import { SwordschroniclesActorSheet } from "./actor/actor-sheet.js";
import { SwordschroniclesItem } from "./item/item.js";
import { SwordschroniclesItemSheet } from "./item/item-sheet.js";

Hooks.once('init', async function() {

  game.swordschronicles = {
    SwordschroniclesActor,
    SwordschroniclesItem,
    rollItemMacro
  };
 

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  game.settings.register("swordschronicles","initiativeType",{
	name: "Initiative Type",
	  hint: "Regular or Social Combat",
	  scope: "world",
	  config: true,
	  type: String,
	  choices: {
		"combat": "Regular Combat",
		"social": "Social Combat"
	  },
	  default: "combat",
	  onChange: value => {
		  console.log("initiative test",value);
	  }

  });
  CONFIG.Combat.initiative = {
    formula: "(@abilities.agility.value+@abilities.agility.special.quickness)d6kh(@abilities.agility.value)",
    decimals: 2
  };
  //Override initiative to allow for social/physical initiative
const _getInitiativeFormula = combatant => {
  const actor = combatant.actor;
  if (!actor) return "0";
  var flatbonus=0;
  const initmode=game.settings.get("swordschronicles","initiativeType");
  if(initmode == 'combat'){
  var total = actor.data.data.abilities.agility.value+actor.data.data.abilities.agility.special.quickness;
  var keep=actor.data.data.abilities.agility.value;
  flatbonus -= actor.data.data.combat.armorpenalty;
  
  }else{
  var total = actor.data.data.abilities.status.value+actor.data.data.abilities.status.special.reputation;
  var keep=actor.data.data.abilities.status.value;
  }
  console.log("armor penalty to init",actor.data.data.combat);
  var reroll=false;
  var rerolllimit;
  for(let item of actor.data.items){
	  console.log(item.data.modifiers);
	  for (let modidx in item.data.modifiers){
		var mod=item.data.modifiers[modidx];
		  console.log("init debug",mod,initmode);
		if(mod.type=='flat' && mod.effecttype=='other' && mod.target=='initiative' && initmode=='combat'){
                       try{
                        var change=new Roll(mod.effect,actor.data.data).roll().total;
                        flatbonus+=change;
			       console.log(flatbonus);
                        }catch(error){
                                console.log("formula error",mod.effect,actor.data);

                        }

		}else if(mod.type=='flat' && mod.effecttype=='other' && mod.target=='socialinitiative' && initmode=='social'){

                       try{
                        var change=new Roll(mod.effect,actor.data.data).roll().total;
                        flatbonus+=change;
                        }catch(error){
                                console.log("formula error",mod.effect,actor.data);
                        }
			console.log("debug");
		}else if(mod.type=='reroll' && ((mod.target=='socialinitiative' && initmode=='social') || (mod.target=='initiative' && initmode=='combat'))){
			reroll=true;
                       try{
                        var change=new Roll(mod.effect,actor.data.data).roll().total;
                        rerolllimit=change;
                        }catch(error){
                                console.log("formula error",mod.effect,actor.data);
                        }

		}
	  }
  }
var rollResults;
	if(reroll && rerolllimit == null){
  rollResults = new Roll("(@total)d6kh(@keep)r1+@bonus",{total: total, keep: keep,bonus: flatbonus}); 
	}else if(reroll){
  rollResults = new Roll("(@total)d6kh(@keep)r(@limit)=1+@bonus",{total: total, keep: keep,limit:rerolllimit,bonus: flatbonus}); 
	}else{
  rollResults = new Roll("(@total)d6kh(@keep)+@bonus",{total: total, keep: keep,bonus: flatbonus}); 
	}
  console.log(rollResults._formula);
  return rollResults._formula;
};
Combat.prototype._getInitiativeFormula = _getInitiativeFormula;

  // Define custom Entity classes
  CONFIG.Actor.entityClass = SwordschroniclesActor;
  CONFIG.Item.entityClass = SwordschroniclesItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("swordschronicles", SwordschroniclesActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("swordschronicles", SwordschroniclesItemSheet, { makeDefault: true });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });
});

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createSwordschroniclesMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createSwordschroniclesMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.swordschronicles.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "swordschronicles.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}



/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}
