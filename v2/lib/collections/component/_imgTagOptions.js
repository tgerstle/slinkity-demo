/*
    Tag prefixes are used to assign a type to a tag, some tags can be matched without a prefix using the
    tagKeys array __ especially legacy tags that have been migrated
    The prefix is used to match the tag text starting in the 0 position
    The type is used to assign a type to a matched tag
    The rules allow for specific handling when tags are added to the array
    
    Prefixes/types are created dynamically too
    The default rules are used for any dynamically created tagPrefix groups which are created
    by splitting a tag by '__' and using the first part

    list of rules: single, notEmpty
    single __ only one can be enabled at a time
    notEmpty __ this prevents tags from being clicked a second time to disable, so the only way to switch is click another tag, this is the functionality of the metal type
    
    clearing all tags or a specific type
    a tag with the text 'clear_tags' will clear all tags
    a tag with the text 'PREFIX__clear_tags' will clear all tags in the type that matches the prefix
    */
// const imgTagOptions = {
//     tagPrefixes: [
//         {
//             prefix: 'filter_metal--',
//             type: 'metal',
//             rules: ['single', 'notEmpty'],
//         },
//         {
//             prefix: 'matching_id__',
//             type: 'matching',
//             rules: ['single', 'notEmpty'],
//         },
//         {
//             prefix: 'carat_weight_configurable__',
//             type: 'carat_weight_configurable',
//             rules: ['single'],
//         },
//         {
//             prefix: 'default__',
//             type: 'default',
//             rules: ['single'],
//         },
//     ],
//     tagKeys: [
//         {
//             tag: '18k_yellow_gold',
//             type: 'metal',
//         },
//         {
//             tag: '18k_rose_gold',
//             type: 'metal',
//         },
//         {
//             tag: '18k_white_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_yellow_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_rose_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_white_gold',
//             type: 'metal',
//         },
//         {
//             tag: '10k_yellow_gold',
//             type: 'metal',
//         },
//         {
//             tag: '10k_rose_gold',
//             type: 'metal',
//         },
//         {
//             tag: '10k_white_gold',
//             type: 'metal',
//         },
//         {
//             tag: 'platinum',
//             type: 'metal',
//         },
//         {
//             tag: 'silver',
//             type: 'metal',
//         },
//         {
//             tag: '14k_rose_white_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_rose_yellow_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_white_rose_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_white_yellow_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_yellow_rose_gold',
//             type: 'metal',
//         },
//         {
//             tag: '14k_yellow_white_gold',
//             type: 'metal',
//         },
//         {
//             tag: 'sterling_silver__18k_yellow_gold_plated',
//             type: 'metal',
//         },
//         {
//             tag: 'sterling_silver__14k_yellow_gold_plated',
//             type: 'metal',
//         },
//         {
//             tag: 'sterling_silver__14k_rose_gold_plated',
//             type: 'metal',
//         },
//         {
//             tag: 'sterling_silver',
//             type: 'metal',
//         },
//     ],
// };

//onlyMatch -- only show if it matches
//notEmpty -- if there's another tag with the same prefix
//              but different value, remove the image
const tagPrefixes = {
    'filter_metal': {
        type: 'metal',
        rules: [],
    },
    'matching_id': {
        type: 'matching',
        rules: ['onlyMatch'],
    },
    'carat_weight_configurable': {
        type: 'carat_weight_configurable',
        rules: [],
    },
    'default': {
        type: 'default',
        rules: [],
    },
}

const tagTranslations = {
    '18k_yellow_gold': 'filter_metal--18k_yellow_gold',
    '18k_rose_gold': 'filter_metal--18k_yellow_gold',
    '18k_white_gold': 'filter_metal--18k_white_gold',
    '14k_yellow_gold': 'filter_metal--14k_yellow_gold',
    '14k_rose_gold': 'filter_metal--14k_rose_gold',
    '14k_white_gold': 'filter_metal--14k_white_gold',
    '10k_yellow_gold': 'filter_metal--10k_yellow_gold',
    '10k_rose_gold': 'filter_metal--10k_rose_gold',
    '10k_white_gold': 'filter_metal--10k_white_gold',
    'platinum': 'filter_metal--platinum',
    'silver': 'filter_metal--silver',
    '14k_rose_white_gold': 'filter_metal--14k_rose_white_gold',
    '14k_rose_yellow_gold': 'filter_metal--14k_rose_yellow_gold',
    '14k_white_rose_gold': 'filter_metal--14k_white_rose_gold',
    '14k_white_yellow_gold': 'filter_metal--14k_white_yellow_gold',
    '14k_yellow_rose_gold': 'filter_metal--14k_yellow_rose_gold',
    '14k_yellow_white_gold': 'filter_metal--14k_yellow_white_gold',
    'sterling_silver__18k_yellow_gold_plated': 'filter_metal--sterling_silver__18k_yellow_gold_plated',
    'sterling_silver__14k_yellow_gold_plated': 'filter_metal--sterling_silver__14k_yellow_gold_plated',
    'sterling_silver__14k_rose_gold_plated': 'filter_metal--sterling_silver__14k_rose_gold_plated',
    'sterling_silver': 'filter_metal--sterling_silver',
    '14k_white_gold_plated': 'filter_metal--14k_white_gold_plated',
    '14k_yellow_gold_plated': 'filter_metal--14k_yellow_gold_plated',
    '14k_rose_gold_plated': 'filter_metal--14k_rose_gold_plated',
}

const getImages = function (gallery, activeFilters, defaultImages, isPdp = false) {

    const ignoreFilters = [
        'filter_metal--mixed_metals'
    ]
    const defaultMetalFilters = [
        'filter_metal--sterling-silver',
        'filter_metal--silver',
        'filter_metal--platinum',
        'filter_metal--10k_white_gold',
        'filter_metal--18k_white_gold',
        'filter_metal--14k_white_gold',
        'filter_metal--14k_white_yellow_gold'
    ]
    let finalGallery = [...gallery];
    //filter out the images
    let onlyMatch = [];
    for (const prefix in tagPrefixes) {
        if (tagPrefixes[prefix].rules.indexOf('onlyMatch') != -1) {
            if (!activeFilters.some((t) => {
                return t.indexOf(`${prefix}--` != -1)
            })) {
                onlyMatch.push(prefix)
            }
        }
    }
    if (activeFilters.length > 0) {
        activeFilters.forEach((fil) => {
            if (ignoreFilters.indexOf(fil) != -1) {
                return;
            }
            const option = fil.slice(fil.indexOf('--') + 2);
            const prefix = fil.slice(0, fil.indexOf('--'));
            if (typeof tagPrefixes[prefix] != 'undefined') {
                let noMatchesFallback = JSON.parse(JSON.stringify(finalGallery));
                let matchCount = 0;
                //keep matches, like filter_metal--14k_rose_gold
                //but get rid of stuff that has other non-matching
                //like filter_metal--14k-yellow-gold
                finalGallery = finalGallery.filter((img) => {
                    let match = true;

                    if (img.tags.indexOf(fil) != -1) {
                        match = true;
                        matchCount++;
                    } else if (img.tags.some((t) => {
                        return t.indexOf(`${prefix}--`) != -1;
                    })) {
                        match = false
                    }
                    if (match && onlyMatch.length > 0) {
                        onlyMatch.forEach((prefix) => {
                            if (!match) {
                                return;
                            }
                            if (img.tags.some((t) => {
                                return t.indexOf(`${prefix}--`) != -1;
                            })) {
                                match = false
                            }
                        })
                    }
                    return match;
                });

                if (matchCount == 0) {
                    finalGallery = noMatchesFallback;
                }
            }
        })
    } else {
        finalGallery = [];
        if (typeof defaultImages != 'undefined') {
            return defaultImages;
        }
    }
    if (finalGallery.length == 0) {
        finalGallery = [...gallery].filter((img) => {
            let test = img.tags.some((t) => {
                let skip = false;

                if (
                    t.indexOf('filter_metal') != -1 &&
                    defaultMetalFilters.indexOf(t) == -1
                ) {
                    if (ignoreFilters.indexOf(t) == -1) {
                        skip = true;
                    }
                }
                if (!skip && onlyMatch.length > 0) {
                    onlyMatch.forEach((prefix) => {
                        if (skip) {
                            return;
                        }
                        //this will filter out the matching_id images
                        //in the default gallery
                        // if (t.indexOf(`${prefix}`) != -1) {
                        //     skip = true
                        // }
                    })
                }
                return skip;
            })
            return !test;
        })
    }
    if (
        finalGallery.length == 0 &&
        typeof defaultImages != 'undefined' &&
        defaultImages.length > 0
    ) {
        return defaultImages;
    }
    //only use default and hover sort if not pdp main product
    if (!isPdp) {
        finalGallery.sort((a, b) => {
            let scores = {
                a: 0,
                b: 0
            }
            if (!Array.isArray(a.tags)) {
                a.tags = [];
            }
            if (!Array.isArray(b.tags)) {
                b.tags = [];
            }
            [a.tags, b.tags].forEach((ts, indx, arr) => {
                let x = 'a';
                if (indx == 1) {
                    x = 'b';
                }
                ts.forEach((t) => {
                    if (activeFilters.indexOf(t) != -1) {
                        scores[x] += 2;
                    }
                    if (t == 'hover') {
                        scores[x] += 3;
                    }
                    if (t == 'default') {
                        scores[x] += 4;
                    }
                })
            });
            if (a.position > b.position) {
                scores.b++
            }
            if (b.position > a.position) {
                scores.a++
            }
            return scores.b - scores.a;
        })
        //then sort them
        //if no default or hover, filter for default and hover
        let defaultMissing = false;
        let hoverMissing = false;
        let backupDefaultImages = [];
        let backupHoverImages = [];
        if (finalGallery.length == 0 || (typeof finalGallery[0] != 'undefined' && finalGallery[0].tags.indexOf('default') == -1)) {
            defaultMissing = true;
            //need default image
            backupDefaultImages = [...gallery].sort((a, b) => {
                let scores = {
                    a: 0,
                    b: 0
                }
                if (!Array.isArray(a.tags)) {
                    a.tags = [];
                }
                if (!Array.isArray(b.tags)) {
                    b.tags = [];
                }
                [a.tags, b.tags].forEach((ts, indx) => {
                    let x = 'a';
                    if (indx == 1) {
                        x = 'b';
                    }
                    let bonusScore = 0;
                    defaultMetalFilters.forEach((df, indx) => {
                        if (ts.indexOf(df) != -1) {
                            bonusScore += 1
                        }
                    });
                    activeFilters.forEach((af) => {
                        if (ts.indexOf(af) != -1) {
                            bonusScore += 3
                        }
                    });
                    if (ts.indexOf('default') != -1) {
                        bonusScore = bonusScore + 3;
                    }
                    scores[x] += bonusScore
                })
                if (a.position > b.position) {
                    scores.b++
                }
                if (b.position > a.position) {
                    scores.a++
                }
                return scores.b - scores.a;
            });

        }
        if (
            typeof finalGallery[1] == 'undefined' ||
            (typeof finalGallery[1] != 'undefined' &&
                finalGallery[1].tags.indexOf('hover') == -1 &&
                finalGallery[0].tags.indexOf('hover') == -1)
        ) {
            hoverMissing = true;
            backupHoverImages = [...gallery].sort((a, b) => {
                let scores = {
                    a: 0,
                    b: 0
                }
                if (!Array.isArray(a.tags)) {
                    a.tags = [];
                }
                if (!Array.isArray(b.tags)) {
                    b.tags = [];
                }
                [a.tags, b.tags].forEach((ts, indx) => {
                    let x = 'a';
                    if (indx == 1) {
                        x = 'b';
                    }
                    let bonusScore = 0;
                    defaultMetalFilters.forEach((df, indx) => {
                        if (ts.indexOf(df) != -1) {
                            bonusScore++;
                        }
                    });
                    activeFilters.forEach((af) => {
                        if (ts.indexOf(af) != -1) {
                            bonusScore += 3
                        }
                    });
                    if (ts.indexOf('hover') != -1) {
                        bonusScore = bonusScore + 3;
                    }
                    scores[x] += bonusScore
                });
                if (a.position > b.position) {
                    scores.b++
                }
                if (b.position > a.position) {
                    scores.a++
                }
                return scores.b - scores.a;
            });
        }

        if (defaultMissing && hoverMissing) {
            if (backupHoverImages.length > 0) {
                finalGallery.unshift(backupHoverImages[0])
            }
            if (backupDefaultImages.length > 0) {
                finalGallery.unshift(backupDefaultImages[0]);
            }
        }
        if (defaultMissing && !hoverMissing) {
            if (backupDefaultImages.length > 0) {
                finalGallery.unshift(backupDefaultImages[0]);
            }
        }
        if (!defaultMissing && hoverMissing) {
            if (backupDefaultImages.length > 0) {
                let defaultImage = finalGallery.shift();
                finalGallery.unshift(backupDefaultImages[0]);
                finalGallery.unshift(defaultImage);
            }
        }
    }
    if (gallery.length == 0) {
        finalGallery = [...gallery].sort((a, b) => {
            return b.position - a.position;
        })
    }
    let galleryIndexes = finalGallery.map((img) => {
        return img.originalIndex;
    })
    //unique
    galleryIndexes = galleryIndexes.filter((v, i, a) => a.indexOf(v) == i)
    return galleryIndexes;
}

const altAttCodes = {
    'metal_type': 'filter_metal',
    'stone_type': 'filter_stone_type',
    'color': 'filter_color'
}

module.exports = { altAttCodes, tagTranslations, tagPrefixes, getImages };
