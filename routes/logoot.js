module.exports = {
    insertServerChar, 
    deleteServerChar, 
    textToCharMap
};

const BASE = 256;

/**
 * a - 0
 * b - 1
 * c - 2
 * d - 3
 *
 * If x is inserted b/w a & b then it position is 
 * represented by a fractions after the main postion i.e called site
 * The part after the site or after the decimal are digits
 *
 * a - 0 
 * x - 0.01
 * b - 1
 * c - 2
 * d - 3
 */

/**
 * Create indentifier object
 * Collection of identifier makes a position. 
 * @param  {[type]} digit  Think digit as value after decimales
 * @param  {[type]} site  
 * @return {[type]}       Identifier object
 */
function create(digit, site) {
    const obj = { digit, site };
    Object.freeze(obj);
    return obj;
}

function cons(head, rest) {
    return [head].concat(rest);
}
/**
 * Return 
 * @param  {[type]} list [description]
 * @return {[type]}      [description]
 */
function head(list) {
    return list[0];
}

function rest(list) {
    return list.slice(1);
}

/**
 * Postion : Array of Identifier Object
 * It is unique for each character. 
 */
function comparePosition(p1, p2) {
    for (let i = 0; i < Math.min(p1.length, p2.length); i++) {
        const comp = compareIdentifier(p1[i], p2[i]);
        if (comp !== 0) {
            return comp;
        }
    }
    if (p1.length < p2.length) {
        return - 1;
    } else if (p1.length > p2.length) {
        return 1;
    } else {
        return 0;
    }
}

function compareIdentifier(i1, i2) {
    if (i1.digit < i2.digit) {
        return -1;
    } else if (i1.digit > i2.digit) {
        return 1;
    } else {
        if (i1.site < i2.site) {
            return -1;
        } else if (i1.site > i2.site) {
            return 1;
        } else {
            return 0;
        }
    }
}

/** [generatePositionBetween description] */

function generatePositionBetween(position1, position2, site) {
    // Get either the head of the position, or fallback to default value
    const head1 = head(position1) || create(0, site);
    const head2 = head(position2) || create(256, site);
    if (head1.digit !== head2.digit) {
        // Case 1: Head digits are different
        const n1 = fromIdentifierList(position1);
        const n2 = fromIdentifierList(position2);
        const delta = subtractGreaterThan(n2, n1);
        // Increment n1 by some amount less than delta
        const next = increment(n1, delta);
        return toIdentifierList(next, position1, position2, site);
    } else {
        if (head1.site < head2.site) {
            // Case 2: Head digits are the same, sites are different
            return cons(head1,
                generatePositionBetween(rest(position1), [], site));
        } else if (head1.site === head2.site) {
            // Case 3: Head digits and sites are the same
            return cons(head1,
                generatePositionBetween(rest(position1), rest(position2), site));
        } else {
            throw new Error("invalid site ordering");
        }
    }
}




function fromIdentifierList(identifiers) {
    return identifiers.map(ident => ident.digit);
}

function subtractGreaterThan(n1, n2) {
    var carry = 0;
    var diff = Array(Math.max(n1.length, n2.length));
    for (var i = diff.length - 1; i >= 0; i--) {
        var d1 = (n1[i] || 0) - carry;
        var d2 = (n2[i] || 0);
        if (d1 < d2) {
            carry = 1;
            diff[i] = d1 + BASE - d2;
        }
        else {
            carry = 0;
            diff[i] = d1 - d2;
        }
    }
    return diff;
}

function increment(n1, delta) {
    const firstNonzeroDigit = delta.findIndex(x => x !== 0);
    const inc = delta.slice(0, firstNonzeroDigit).concat([0, 1]);

    const v1 = add(n1, inc);
    const v2 = v1[v1.length - 1] === 0 ? add(v1, inc) : v1;
    return v2;
}

function add(n1, n2) {
    let carry = 0;
    const diff =  Array(Math.max(n1.length, n2.length));
    for (let i = diff.length - 1; i >= 0; i--) {
        const sum = (n1[i] || 0) + (n2[i] || 0) + carry;
        carry = Math.floor(sum / BASE);
        diff[i] = (sum % BASE);
    }
    if (carry !== 0) {
        throw new Error("sum is greater than one, cannot be represented by this type");
    }
    return diff;
}

function fromIdentifierList(identifiers) {
    return identifiers.map(ident => ident.digit);
}

function toIdentifierList(n, before, after, creationSite) {
    // Implements the constructPosition rules from the Logoot paper
    return n.map((digit, index) => {
        if (index === n.length - 1) {
            return create(digit, creationSite);
        } else if (index < before.length && digit === before[index].digit) {
            return create(digit, before[index].site);
        } else if (index < after.length && digit === after[index].digit) {
            return create(digit, after[index].site);
        } else {
            return create(digit, creationSite);
        }
    });
}



function insertServerChar(charObj, charMap) {
    let position = charObj.position;
    let ch = charObj.value;
    // insert when no characters are present
    
    if (charMap.length === 0 ) {
        charMap.push(charObj);
        console.log('Server insert at beginning ');
        return charMap;
    }
    // insert b/w    
    for (var index in charMap) {
        if (comparePosition(position, charMap[index].position) < 0) {
            charMap.splice(index, 0, charObj);
            console.log('Server insert in b/w');
            return charMap;
        }
    }
    charMap.push(charObj);
    console.log('Server insert at last index');
    return charMap;
}

function deleteServerChar(charObj, charMap) {
    let position = charObj.position;
    let ch = charObj.value;
    
    for (let index in charMap) {
        if (comparePosition(position, charMap[index].position) === 0 &&
            charMap[index].value === ch ) {
            charMap.splice(parseInt(index), 1);
            console.log('Server delete');
            return charMap;
        }
    }
    console.error('Cant find delete character');
    return charMap;
}

// will be used to convert docSnapshot  to charMap for versioned docs
// using siteNumber = 0 as everything is being reset
// as the character will be coming sequentially 
// there will only two case to handle
function textToCharMap(text) {
    let charObj = {};
    return charMap = text.split('').reduce((lastcharObj, ch, index)=>{
        // inserting at 1st position
        if (index === 0) {
            let beginPosition = [{
                site : 0, 
                digit : 1
            }];
            return {
                value : ch, 
                position : beginPosition   
            };   
        } 
        //inserting new characters
        else {
            if (ch === '\n') {
                let nextDigit = lastcharObj.position[0].digit +1;
                return {
                    value : ch, 
                    position : [{
                        site : 0, 
                        digit : nextDigit
                    }]
                };            
            } else {
                let position1 = lastcharObj.position;
                return {
                    value : ch, 
                    position : generatePositionBetween(position1, [], 0 )
                };    
            }        
        }
    }, {});
} 

// console.log(textToCharMap(`I am not sorry
    // I am sorry`));

