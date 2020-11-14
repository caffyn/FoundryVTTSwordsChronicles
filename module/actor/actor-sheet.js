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
    console.log("update output?",features);
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
    html.find('.rollable').click(this._promptRoll.bind(this));
    

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
 async _promptRoll(event){
	event.preventDefault();
	const element = event.currentTarget;
	const dataset = element.dataset;
	var hasstunt;
	if(this.actor.data.data.config.usestunts == "yes"){
		hasstunt=true;
	}else{
		hasstunt=false;
	}
	const rolltype=dataset.category;
	let template = "systems/swordschronicles/templates/roll.html";
	let params={"stunts": hasstunt,"type": rolltype};
	var html=await renderTemplate(template,params);
	var title=dataset.flavor;
	let d = new Dialog({
		title: title,
		content: html,
	  	buttons: {roll:{label:"Roll",
			callback: html =>  this._performRoll(html,dataset)}}
	});
	d.render(true);

  }

_performRoll(html,dataset){
	const data=this.actor.data.data;
    var test=html.find('[name="stunt"]');
	var stunt="0";
	for(let elem of test){
		if(elem.checked){
			stunt=elem.value;
		}
	}
	var bonusflat=parseInt(html.find('[name="bonusflat"]').val());
	var bonusdice=parseInt(html.find('[name="bonusdice"]').val());
	var penaltyflat=parseInt(html.find('[name="penaltyflat"]').val());
	var penaltydice=parseInt(html.find('[name="penaltydice"]').val());
        var bonus=0;
	if(dataset.category == "attack"){
		const items=this.actor.data.items;
		var id = dataset._id;
		for(let temp of items){
			if(temp._id == id){
				var weapon=temp.data;
				var name=temp.name;
			}
		}
		//var weapon = this.actor.data.items[dataset.attindex].data;
		if(weapon.type == "melee"){
			    var abilityName="fighting";
		}else{
			    var abilityName="marksmanship";
		}
		var special=weapon.special;
		if(special != "none"){
			bonus=parseInt(data.abilities[abilityName].special[special]);
		}
	}else{
    		var abilityName=dataset.ability;
    		bonus=parseInt(data.abilities[abilityName].special[dataset.specialization]);
	}
    var total=parseInt(data.abilities[abilityName].value);
    var keep=total;
    if(bonus == null){
	    bonus=0;
    }
    total+=parseInt(bonus);
    total+=parseInt(bonusdice);
    keep -= parseInt(penaltydice);
    if (total > (data.abilities[abilityName].value * 2)){
	    total=data.abilities[abilityName].value*2;
    }

	//Now, to handle injuries, wounds,fatigue, and frustration
	bonusflat -= data.status.fatigue.value;
	bonusflat -= data.status.injuries.value;
	keep -= data.status.wounds.value;
	if(dataset.category == "ability"){
		/**This is an ability roll(**/
	    var flavor="Rolling "+abilityName+", specialization: ";
	    if(dataset.specialization){
		    flavor += dataset.specialization;
	    }else {
		    flavor += "None";
	    }
	}else if(dataset.category == "socialattack"){
		var flavor="Social Attack: ";
		flavor+=dataset.flavor;
		const damage=data.abilities[dataset.damage].value;
		flavor += " for "+damage+" damage"; 
		keep -= data.status.frustrations.value;
	}else if(dataset.category == "attack"){

			  
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
			bonusflat+=1;
		}else if(weapon.quality==3){
			//Extraordinary weapon. +1 flat, +1 damage
			damage+=1;
			bonusflat+=1;
		}
		
		var flavor="Attacks with "+ name + " for " + damage + " damage";

	}
	if(this.actor.data.data.config.usestunts == "yes"){
		if(stunt=="0"){
			flavor += ", No Stunt";
		}else if(stunt=="1"){
			flavor += ", 1-Dot Stunt";
			bonusflat+=1+data.config.stuntbonus;
		}else if(stunt=="2"){
			bonusflat+=2+data.config.stuntbonus;
			flavor += ", 2-Dot Stunt";
		}else if(stunt=="2b"){
			bonusflat+=data.config.stuntbonus;
			total+=1;
			flavor += ", 2-Dot Stunt";
	}		

	}
    let temp= new Roll("(@total)d6kh(@keep)+@flat",{total: total, keep: keep,flat: bonusflat});
    temp.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: flavor
      });
}
}
