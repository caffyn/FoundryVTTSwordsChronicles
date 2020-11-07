/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class SwordschroniclesActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swordschronicles", "sheet", "actor"],
      template: "systems/swordschronicles/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.data.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }

    // Prepare items.
    if (this.actor.data.type == 'character') {
      this._prepareCharacterItems(data);
    }

    return data;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    // Initialize containers.
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: []
    };
    const weapon=[];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.data.spellLevel != undefined) {
          spells[i.data.spellLevel].push(i);
        }
      }
      else if(i.type === 'weapon'){
	weapon.push(i);
      }
    }
    //Health and composure calcs

    actorData.data.health.max=(actorData.data.abilities.endurance.value * 3);
    if(actorData.data.health.value > actorData.data.health.max){
	   actorData.data.health.value=actorData.data.health.max; 
    }
    actorData.data.composure.max=(actorData.data.abilities.will.value * 3);
    if(actorData.data.composure.value > actorData.data.composure.max){
	   actorData.data.composure.value=actorData.data.composure.max; 
    }

    // Assign and return
    actorData.gear = gear;
    actorData.features = features;
    actorData.spells = spells;
    actorData.weapon = weapon;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));
    
    //Attacks
    html.find('.attack').click(this._attack.bind(this));

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = ev => this._onDragItemStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }
_handleStunt(flavor,total,keep,flatbonus=0,stuntbonus=0){
    let d = new Dialog({
	    title: "Stunt",
	    content: "Enter stunt level. Majestic is counted",
	    buttons: {
		    zeroDot: {
			label: "No Stunt",
			callback: () => this._performRoll(flavor+", no stunt",total,keep,flatbonus)
		    },
			    oneDot: {
			    label: "1 Dot",
			callback: () => this._performRoll(flavor+", 1-Dot Stunt",total,keep,flatbonus+stuntbonus+1)
		    },
			    twoDot: {
			    label: "2 Dot Flat",
			callback: () => this._performRoll(flavor + ", 2-Dot Stunt",total,keep,flatbonus+stuntbonus+2)
		    },
			    die: {
			    label: "2 Dot Die",
			callback: () => this._performRoll(flavor+", 2-Dot Stunt",total+1,keep,flatbonus+stuntbonus)
		    }
	    },
	    default: "zeroDot"
    });
    d.render(true);


}

_performRoll(flavor,total,keep,flatbonus=0){
    let temp= new Roll("(@total)d6kh(@keep)+@flat",{total: total, keep: keep,flat: flatbonus});
    temp.roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: flavor
      });
}

  _attack(event) {
	event.preventDefault();
	const element = event.currentTarget;
	const dataset = element.dataset;
	const items=this.actor.data.items;
	var id = dataset._id;
	for(var i in items){
		var temp=items[i];
		if(temp._id == id){
			var weapon=temp.data;
		}
	}
	//var weapon = this.actor.data.items[dataset.attindex].data;
	const data=this.actor.data.data;
	var name = this.actor.data.items[dataset.attindex].name
	var flatbonus=0;
	if(weapon.type == "melee"){
		    var ability="fighting";
	}else{
		    var ability="marksmanship";
	}
	var bonus=0;
	var special=weapon.special;
	if(special != "none"){
		bonus=data.abilities[ability].special[special];
	}
		  
	var total=data.abilities[ability].value;
	var keep=total;
	//TODO: wound penalties, training, etc.
	if(bonus>total){
		total=total*2;
	}else{
		total= total+bonus;
	}
	if (weapon.damageability != "none"){
		var damage=data.abilities[weapon.damageability].value;
	}else{
		var damage=0;
	}
	damage += weapon.damage;
	if(weapon.quality==0){
		//Peasant weapon. 1 die penalty
	}else if(weapon.quality==2){
		//Superior weapon. +1 flat
		flatbonus+=1;
	}else if(weapon.quality==3){
		//Extraordinary weapon. +1 flat, +1 damage
		damage+=1;
		flatbonus+=1;
	}
	var flavor="Attacks with "+ name + " for " + damage + " damage";
	this._handleStunt(flavor,total,keep,flatbonus,data.bonuses.stunt);

  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if(dataset.rollability) {
	    //Special code path for new rollables. Eventually going to be default
	    const abilityName=dataset.ability;
	    const data=this.actor.data.data;


	    var score=data.abilities[abilityName].value;
	    var bonus=0;
	    var keep=score;
	    bonus=data.abilities[abilityName].special[dataset.specialization];
	    if(bonus == null){
		    bonus=0;
	    }
	    
	    if (bonus > score){
		    score=score*2;
	    }else {
		    score=score+bonus
	    }
	    var flavor="Rolling "+abilityName+", specialization: ";
	    if(dataset.specialization){
		    flavor += dataset.specialization;
	    }else {
		    flavor += "None";
	    }
	    this._handleStunt(flavor,score,keep,0,this.actor.data.data.bonuses.stunt);

	    
	    //TODO: add proper penalties

    }else if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.data.data);
      let label = dataset.label ? `Rolling ${dataset.label}` : '';
      roll.roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    }
  }

}
