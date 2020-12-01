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
    if (this.actor.data.type == 'character' || this.actor.data.type == 'unit') {
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
    const modifiers=[];
    const spells = [];
    const weapon=[];
	    // Iterate through items, allocating to containers
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
		                      for(let j in i.data.modifiers){
                        let currentmod=i.data.modifiers[j];
                        modifiers.push(currentmod);
                }


		      }
		      // Append to spells.
		      else if (i.type === 'spell') {
			  spells.push(i);
		      }
		      else if(i.type === 'weapon'){
			weapon.push(i);
		      }
		    }


		    //Health and composure final calcs

    // Assign and return
    console.log('modifiers',modifiers);
    actorData.gear = gear;
    actorData.features = features;
    actorData.modifiers = modifiers;
    actorData.spells = spells;
    actorData.weapon = weapon;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Language
    html.find('.language-create').click(this._onLanguageCreate.bind(this));

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
	    console.log("debug delete",li,li.data("itemId"));
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
  async _onLanguageCreate(event) {
    event.preventDefault();
    var nextindex=1;
    var name="language"+nextindex;
    console.log('lang',this.actor.data);
    while(name in this.actor.data.data.abilities){
	nextindex+=1;
	name="language"+nextindex;

    }
    console.log("Creating new language",name);
    var currentData=duplicate(this.actor.data.data.abilities);
    var newData={};
    var unitType=this.actor.data.type;
    var insertAfter="language"+(nextindex-1);
    for(var ability in currentData){
	    newData[ability]=currentData[ability];
	    if(ability==insertAfter){
		    if(unitType == 'character'){
		    newData[name]={"customname":"default","passive":8,"chargen_increase":false,"value":2,"special":{"eloquence": 0,"literacy": 0}};
		    }else{

		    newData[name]={"customname":"default","passive":8,"chargen_increase":false,"value":2};
		    }
	    }
    }
    console.log('rewrote',newData);
    var updated=this.actor.data.data;
    updated.abilities=newData;
    await this.object.update({"data":updated},{recursive: false,noHook: true,diff: false});
    
    
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
	var chartype=this.actor.data.type;
	let template = "systems/swordschronicles/templates/roll.html";
	let params={"stunts": hasstunt,"type": rolltype,"chartype":chartype};
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
	var bonusdice=0;
	var testdice=parseInt(html.find('[name="testdice"]').val());
	var penaltyflat=parseInt(html.find('[name="penaltyflat"]').val());
	var penaltydice=parseInt(html.find('[name="penaltydice"]').val());
        var bonus=0;
	var damage=0;
	const items=this.actor.data.items;
	var special="none";
	var abilityName;
	if(dataset.category=="avert"){
		abilityName="will";
		special="dedication";
    		bonus=parseInt(data.abilities.will.special.dedication);
	}else if(dataset.category=="spell"){
		//Spellcasting. Special rules apply. 
		abilityName=dataset.ability;
		var id = dataset._id;
		for(let temp of items){
			if(temp._id == id){
				var spell=temp.data;
				var name=temp.name;
			}
		}
	}else if(dataset.category == "attack"){
		if(data.formation){
			//We have formations. Apply formations.
			if(data.formation=='column'){
				penaltydice += 1;
			}
			if(data.formation=='wedge'){
				
			}
			//TODO: make tortoise not attack?
		}
		var id = dataset._id;
		for(let temp of items){
			if(temp._id == id){
				var weapon=temp.data;
				var name=temp.name;
			}
		}
		if(weapon.type == "melee"){
			    abilityName="fighting";
		}else{
			    abilityName="marksmanship";
		}
		special=weapon.special;
		if(special != "none"){
			bonus=parseInt(data.abilities[abilityName].special[special]);
		}
		if(weapon.training >0){
			if(weapon.training > bonus){
				bonus=0;
				testdice -= (weapon.training - bonus);
			}else{
				bonus=bonus-weapon.training;
			}


		}
	}else{
    		abilityName=dataset.ability;
		special=dataset.specialization;


		if(special != 'none' && special != null){
    		bonus=parseInt(data.abilities[abilityName].special[special]);
		}
	}
    var total=parseInt(data.abilities[abilityName].value);
    var keep=total;
    if(bonus == null){
	    bonus=0;
    }
    if(special == null){
	    special = 'none';
    }
    total+=parseInt(bonus);
    keep -= parseInt(penaltydice);


	var rerolldice=0;
	var reroll=false;
	var reroll6=0;
	var rerollhigh=false;

	//Now, go through modifiers and apply as needed.
	for(let currentitem of items){
		if(currentitem.type == 'feature'){
			for(let index in currentitem.data.modifiers){
				var mod=currentitem.data.modifiers[index];
				var change=0;
				try{
					change=new Roll(mod.effect,data).roll().total;
				}catch(error){
					if(mod.effect!=""){

					console.log("bonus parse failure",currentitem,error);
					}
					change=0;
				}
				if(mod.type=="flatpenalty"){
					change=change*-1;
				}
				if(abilityName == mod.target && (mod.special == 'none' || special == mod.special) && mod.effecttype=='damage'){
					damage+=change;
				}
				console.log("special is",special);
				console.log("social attack debug",mod.effecttype,special,mod.special);
				if(abilityName == mod.target && (mod.special == 'none' || special == mod.special) && (mod.effecttype == 'ability' || dataset.category==mod.effecttype)){
				//Listed bonus is relevant. Now to parse bonus 
					console.log("proceeding",mod.type,mod.type=="reroll6");
					if(mod.type=="flat"){
						//This should be resolved as a flat bonus/penalty to the roll	
						bonusflat+=change;
						
						
					}else if(mod.type=="bonusdie"){
						//This should grant bonus dice instead
						bonusdice+=change;
					}else if(mod.type=="losebonus"){
						//This should grant bonus dice instead
						bonusdice-=change;
					}else if(mod.type=="penaltydie"){
						console.log("debug",change,mod.effect);
						//This should remove test dice
						total-=change;
						keep-=change;
					}else if(mod.type=="testdie"){
						//This should grant test dice instead
						total+=change;
						keep+=change;
					}else if(mod.type=="reroll"){
						//Reroll. 
						rerolldice+=change;
						reroll=true;
						if(mod.effect == ""){
							//Unlimited rerolls if field is blank
							rerolldice=0;
						}
					
					}else if(mod.type=="reroll6"){
						//Reroll. 
						reroll6+=change;
						rerollhigh=true;
						if(mod.effect == ""){
							//Unlimited rerolls if field is blank
							reroll6=0;
						}
					}
				}
				else if(mod.effecttype=='magic' && ((mod.target=="spells" && dataset.category=="spell" && dataset.subcategory=="spell") || (mod.target=="ritual_align" && dataset.subcategory=="ritual" && dataset.stage=="alignment") || (mod.target=="ritual_invoke" && dataset.subcategory=="ritual" && dataset.stage=="invocation") || (mod.target=="ritual_unleash" && dataset.subcategory=="ritual" && dataset.stage=="unleashing") || (mod.target=="avert" && dataset.category=="avert" ))){
					//Magic
					if(mod.type=="flat"){
						//This should be resolved as a flat bonus/penalty to the roll	
						bonusflat+=change;
						
					}else if(mod.type=="bonusdie"){
						//This should grant bonus dice instead
						bonusdice+=change;
					}else if(mod.type=="testdie"){
						//This should grant test dice instead
						total+=change;
						keep+=change;
					}else if(mod.type=="losebonus"){
						//This should grant bonus dice instead
						bonusdice-=change;
					}else if(mod.type=="penaltydie"){
						console.log("debug",change,mod.effect);
						//This should remove test dice
						total-=change;
						keep-=change;
					}else if(mod.type=="reroll"){
						//Reroll. 
						rerolldice+=change;
						reroll=true;
						if(mod.effect == ""){
							//Unlimited rerolls if field is blank
							rerolldice=0;

						}
					
					}else if(mod.type=="reroll6"){
						//Reroll. 
						reroll6+=change;
						rerollhigh=true;
						if(mod.effect == ""){
							//Unlimited rerolls if field is blank
							reroll6=0;
						}
					}
				}
				}
			}

		}
		
	    if (total > (data.abilities[abilityName].value * 2)){
		    total=data.abilities[abilityName].value*2;
	    }
    //Bonus dice from interface can override normal limits
	if(bonusdice > 0){
		total+=bonusdice;
	}

	total+=parseInt(html.find('[name="bonusdice"]').val());
		//Now, to handle injuries, wounds,fatigue, and frustration
	if(data.status.fatigue){
		//Units don't have any of this.
		if (data.status.fatigue.value) bonusflat -= data.status.fatigue.value;
		if (data.status.injuries.value) bonusflat -= data.status.injuries.value;
		if ( data.status.wounds.value) keep -= data.status.wounds.value;
	}
		if(dataset.category == "ability"){
			/**This is an ability roll(**/
		    var flavor="Rolling "+abilityName+", specialization: ";
	//Check for armor penalty. Applies penalty to Agility tests
	if(abilityName == 'agility'){
		penaltyflat+=data.combat.armorpenalty;
	}
			    flavor += special;
		}else if(dataset.category == "socialattack"){
			var flavor="Social Attack: ";
			flavor+=dataset.flavor;
			var damage=data.abilities[dataset.damage].value;
			flavor += " for "+damage+" damage"; 
			keep -= data.status.frustrations.value;
		}else if(dataset.category == "avert"){
			var flavor="Avert Magic: ";
			bonusflat+=data.sorcery.averting;
		}else if(dataset.category == "attack"){

				  
			if (weapon.damageability != "none"){
g			}else{
				damage+=0;
			}
			damage+=new Roll(weapon.damage,data).roll().total;
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

	}else if(dataset.category=="spell"){
		console.log("spell debug",spell);
		if(spell.type=="ritual"){
			var flavor="Ritual: "+name+", "+dataset.stage+" stage, Effects: ";
			flavor+=spell[dataset.stage].flavor;

		}else if(spell.type=="spell"){

			var flavor="Casting Spell: "+name+", Effects: ";
			flavor+=spell['invocation'].flavor;

		}		
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
	var temp;
	bonusflat-=penaltyflat;
	total+=testdice;
	keep+=testdice;
	if(rerollhigh && reroll6 == 0){
    temp= new Roll("(@total)d6kh(@keep)r6+@flat",{total: total, keep: keep,flat: bonusflat});
	}
	else if(rerollhigh){
	temp= new Roll("(@total)d6kh(@keep)r(@limit)=6+@flat",{total: total, keep: keep,limit: reroll6, flat: bonusflat});
	}else if(reroll && rerolldice == 0){
    temp= new Roll("(@total)d6kh(@keep)r1+@flat",{total: total, keep: keep,flat: bonusflat});
	}else if(reroll){
	temp= new Roll("(@total)d6kh(@keep)r(@limit)=1+@flat",{total: total, keep: keep,limit: reroll6, flat: bonusflat});
	}else{
    temp= new Roll("(@total)d6kh(@keep)+@flat",{total: total, keep: keep,flat: bonusflat});
	}
    temp.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: flavor
      });
}
}
