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
    actorData.data.combat.defense=actorData.data.abilities.agility.value+actorData.data.abilities.athletics.value+actorData.data.abilities.awareness.value+actorData.data.combat.defensebonus;
    actorData.data.socialcombat.defense=actorData.data.abilities.awareness.value+actorData.data.abilities.cunning.value+actorData.data.abilities.status.value+actorData.data.socialcombat.defensebonus;

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
    
    //New roll dialog
    html.find('.rolldialog').click(this._promptRoll.bind(this));
    //Attacks
    html.find('.attack').click(this._attack.bind(this));
    //Social Attacks
    html.find('.socialattack').click(this._socialAttack.bind(this));

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
    console.log('debug',temp);
    temp.roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: flavor
      });
}

  _socialAttack(event) {
	event.preventDefault();
	const element = event.currentTarget;
	const dataset = element.dataset;
	const data=this.actor.data.data;
	const ability=data.abilities[dataset.ability].value;
	const special=data.abilities[dataset.ability].special[dataset.special];
	const damage=data.abilities[dataset.damage].value;
	const attacktype=dataset.flavor;
	//TODO: Intimidate can be Act or Bluff when deceiving. 
	
	var total=ability;
	var keep=total;
	if (special > total){
		total = total * 2;
	}else{
		total= total+special;
	}
	var flatbonus=0;

	//Now, to handle injuries, wounds,fatigue, and frustration
	flatbonus -= data.status.fatigue.value;
	flatbonus -= data.status.injuries.value;
	keep -= data.status.wounds.value;
	keep -= data.status.frustrations.value;

	var flavor="Attacks with "+ attacktype + " for " + damage + " influence";
	if(data.config.usestunts == "yes"){
		this._handleStunt(flavor,total,keep,0,data.config.stuntbonus);
	}else{
		this._performRoll(flavor,total,keep);
	}

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
			var name=temp.name;
		}
	}
	//var weapon = this.actor.data.items[dataset.attindex].data;
	const data=this.actor.data.data;
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
	//Now, to handle injuries, wounds, and fatigue. 
	flatbonus -= data.status.fatigue.value;
	flatbonus -= data.status.injuries.value;
	keep -= data.status.wounds.value;
	
	var flavor="Attacks with "+ name + " for " + damage + " damage";
	if(data.config.usestunts == "yes"){
		this._handleStunt(flavor,total,keep,flatbonus,data.config.stuntbonus);
	}else{
		this._performRoll(flavor,total,keep,flatbonus);
	}

  }
  //This is meant to produce a stunt/bonus dialog.
 async _promptRoll(event){
	event.preventDefault();
	const element = event.currentTarget;
	const dataset = element.dataset;
	const data=this.actor.data.data;
	let template = "systems/swordschronicles/templates/roll.html";
	let params={"testkey": "testval"};
	var html=await renderTemplate(template,params);
	let d = new Dialog({
		title: "Roll It!",
		content: html,
	  	buttons: {roll:{label:"Roll"}}
	});
	d.render(true);
	

	 


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
	if(this.actor.data.data.config.usestunts == "yes"){
		this._handleStunt(flavor,score,keep,0,this.actor.data.data.config.stuntbonus);
	}else{
		this._performRoll(flavor,score,keep,0);
	}

	    
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
