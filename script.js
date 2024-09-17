var GLOBAL_LIST = null;
var SORT_PREF = 'time';
var LAST_SCROLL_TOP = 0;

const RETRY = 3;
const RETRY_INTERVAL = 2000;

setupScroll();
(function(){
    const urlParams = new URLSearchParams(window.location.search);
    const liker = urlParams.get('liker');
    const sort = urlParams.get('sort');
    if (liker) {
        const url = "https://api.bgm.tv/v0/users/" + liker;
        let ajax_req = {
            timeout: 5000,
            contentType: 'application/json',
            type: 'GET',
            url: url,
            success: function(resp) {
                $('div#myheader').find("h1").hide()
                $('div#myheader').find("h1").html(`<a href="https://bgm.tv/user/${liker}" target="_blank">${resp.nickname}</a> 最近喜欢的短评`);
                $('div#myheader').find("h1").fadeIn()
            },
            error: function(resp) {
                console.warn("[bgm_luck] bangumi api fails");
            }
        }
        $.ajax(ajax_req);
        refill(`time&liker=${liker}`)
    } else if (sort) refill(sort);
    else refill('time');
})();


function autorefill() {
    refill(SORT_PREF);
}

function deleteLoading(){
    $('.dummy_bg').html('');
}
function addLoading(){
    $('.dummy_bg').html(`
        <div class="loading_wrapper">
            <div class="circle"></div>
            <div class="circle"></div>
            <div class="circle"></div>
        </div>`
    )
}

function refill(sort) {
    SORT_PREF = sort;
    $('#canvas_inner').html('');
    addLoading();
    // replace canvas_inner content
    window.scrollTo(0, 0);
    fetchList(sort);
    // $('#canvas_inner').css('padding-top', $('#myheader').height() + 50);
    // $('#canvas_inner').css('padding-bottom', $('#myfooter').height() + 50);
    // console.log(`${$('#myheader').height()} ${$('#myheader').height()}`);
}

function setupScroll() {
    window.onscroll = function (ev) {
        if (GLOBAL_LIST && GLOBAL_LIST['start']<GLOBAL_LIST['list'].length)
            if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - document.getElementById('myfooter').offsetHeight)) {
                drawNewCards(10);
            }
        // let st = $(this).scrollTop();
        //     if (st > LAST_SCROLL_TOP){
        //         $('#myfooter').slideUp();
        //         $('#myheader').slideDown();
        //     } else {
        //         $('#myheader').slideUp();
        //         $('#myfooter').slideDown();
        //     }
        //     LAST_SCROLL_TOP = st;
    };
    $('.dummy_bg').click(function(e){
        // console.log('canvas click');
        $('.popup').fadeOut();
    })
}

function storeCache(resp) {
    deleteLoading();
    GLOBAL_LIST = {
        'start' : 0,
        'list' : resp
    }
}
function drawNewCards(n) {
    if (GLOBAL_LIST['start'] == GLOBAL_LIST['list'].length) {return}
    const start = GLOBAL_LIST['start'];
    for (let i = start; 
            i < Math.min(GLOBAL_LIST['list'].length, start+n); i++ ) {
        addCard(GLOBAL_LIST['list'][i]);
        GLOBAL_LIST['start'] += 1;
    }
}
function fetchList(sort="time"){
    // deprecated lucky
    const url_reviews = 'https://eastasia.azure.data.mongodb-api.com/app/luckyreviewany-rclim/endpoint/recent_likes';
    let ajax_req = {
        tryCount: 0,
        retryLimit: RETRY,
        retryInterval: RETRY_INTERVAL,
        timeout: 10000,
        crossDomain: true,
        contentType: 'application/json',
        type: 'GET',
        url: url_reviews + "?sort=" + sort,
        success: function(resp) {
            $('#canvas_inner').html(`<div class="cards_container"></div>`);
            if (resp.length) {
                storeCache(resp);
                drawNewCards(30);
            } else {
                $('.dummy_bg').html('<p class="empty_prompt">no records</p>')
            }
        },
        error: function(resp) {
            ajax_req.tryCount++;
            if (ajax_req.tryCount <= ajax_req.retryLimit) {
                setTimeout(function(){
                                // console.log('[bgm_lucky] retry ...'); 
                                $.ajax(ajax_req);
                            }, ajax_req.retryInterval);
                return;
            } else {
                $('#canvas_inner').html('<h2 style="text-align:center">服务器正在ICU抢救中 🚑 ... </h2>');
            }
            return;
        }
    };
    $.ajax(ajax_req);
}
function addCard(cmt) {
    cmt.uid = cmt.uid.replace(/[\uFEFF\u00EF\u00BB\u00BF]/g,'');
    $('.cards_container').append(cardTemplate(cmt));
    bindClick(cmt)
    resizeGridItem(cmt.id);
    updateMetaInfo(cmt);
}

// --- global functions

// --- util functions

function toast(e, msg) {
    const ppup = $(".popup");

    ppup.hide();
    ppup.css({right:  $(window).width() - e.pageX});
    ppup.css({top: e.pageY});
    ppup.find('p').html(msg);
    ppup.fadeIn();

}

function relativeTime(date) {
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;

    var elapsed = new Date() - date;

    if (elapsed < msPerMinute) 
         return '刚刚';   
    else if (elapsed < msPerHour) 
         return Math.round(elapsed/msPerMinute) + '分钟前';   
    else if (elapsed < msPerDay ) 
         return Math.round(elapsed/msPerHour ) + '小时前';   
    else return `${date.toLocaleDateString('zh-Hans-CN')}`
}


function bindClick(cmt) {
    const date = new Date(cmt.time);
    const timestamp = `最近一次点赞: ${relativeTime(date)}
                        <br>总计收到点赞: ${cmt.likes}
                        `;
    const myCard = $(`#${cmt.id}`)
    const likebtn = myCard.find('.like_icon');
    // const likenumber = myCard.find('.like_number');
    likebtn.on( "click", function(e){
        toast(e, timestamp);
        // if (likenumber.is(":hidden")) {
        //     likenumber.fadeIn(300);
        // } else {
        //     likenumber.fadeOut(300);
        // }
    });
    // myCard.find('.comment').click(function(e) {
    //     // console.log(`click ${e.pageX} ${e.pageY}`);
    //     toast(e, timestamp);
    //   });
}

function updateMetaInfo(cmt) {
    const card = $(`#${cmt.id}`);
    function updateUser() {
        const url = "https://api.bgm.tv/v0/users/" + cmt.uid;
        let ajax_req = {
            tryCount: 0,
            retryLimit: RETRY,
            retryInterval: RETRY_INTERVAL,
            timeout: 3000,
            contentType: 'application/json',
            type: 'GET',
            url: url,
            success: function(resp) {
                card.find(".user_name").html(resp.nickname);
            },
            error: function(resp) {
                ajax_req.tryCount++;
                if (ajax_req.tryCount <= ajax_req.retryLimit) {
                    setTimeout(function(){$.ajax(ajax_req)}, ajax_req.retryInterval);
                    console.log('[bgm_lucky] retry ...');
                    return;
                } else {
                    console.warn("[bgm_luck] bangumi api fails");
                }
            }
        }
        $.ajax(ajax_req);
    }
    function backgroundTemplate(url) {
        return `linear-gradient(to top, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.5)), url('${url}')`;
    }
    function updateSubject (){
        const url = "https://api.bgm.tv/v0/subjects/" + cmt.sid;
        let ajax_req = {
            tryCount: 0,
            retryLimit: RETRY,
            retryInterval: RETRY_INTERVAL,
            timeout: 3000,
            contentType: 'application/json',
            type: 'GET',
            url: url,
            success: function(resp) {
                //const url = JSON.stringify(resp.images.common);
                card.find(".subject_name").html(resp.name);
                card.find(".subject_cname").html(resp.name_cn);
                card.find(".poster").css('background-image',`${backgroundTemplate(resp.images.common)}`);
                card.css('opacity', 1);
            },
            error: function(resp) {
                ajax_req.tryCount++;
                card.css('opacity', 1);
                if (ajax_req.tryCount <= ajax_req.retryLimit) {
                    setTimeout(function(){$.ajax(ajax_req)}, ajax_req.retryInterval);
                    console.log('[bgm_lucky] retry ...');
                    return;
                } else {
                    console.warn("[bgm_luck] bangumi api fails");
                }
            }
        };
        $.ajax(ajax_req);
    }
    updateUser();
    updateSubject();
}
function cardTemplate(cmt) {
    const uURL = "https://bgm.tv/user/" + cmt.uid;
    const sURL = 'https://bgm.tv/subject/' + cmt.sid;
    function buildStar(nStar) {
        let half_star = '';
        if (nStar % 2) {
            half_star = '☆';
        }
        return '★'.repeat(Math.floor(cmt.star/2.)) + half_star;
    }
    const like_filled = `<svg xmlns="http://www.w3.org/2000/svg" height="1.5em" viewBox="-20 -20 550 550">
        <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/></svg>`;
    const poster =`
        <div class="poster">
        </div>`;
    const title = `
        <a href='${sURL}' target="_blank"  class="subject_title">
            <p class="subject_name" style="font-size:2em;">${cmt.sid}</p>
            <p class="subject_cname" style="font-size:1.2em; margin-top:5px;">-</p>
        </a>`;
    const userInfo = `
        <a class="user_name" href="${uURL}" target="_blank" style="font-size:1.2em;">${cmt.uid}</a>
        <br />
        <p>${cmt.date} ${buildStar(cmt.star)}</p>
    `;
    const comment_container =`
        <div class="comment_container">
            <div class="user_title">
                ${userInfo}
            </div>
            <div class="comment">
                <p>${cmt.comment}</p>
            </div>
        </div>`;
    const like_icon = `
        <div class="like_number">
            ${cmt.likes}
        </div>
        <div class="like_icon">
            ${like_filled}
        </div>
    `
    const card = `
        <div class="card elegent hoverclass" id=${cmt.id}>
            ${title}${poster}${comment_container}${like_icon}
        </div> 
        `;
    return card;
}

// --- dynamic grids
function resizeGridItem(item_id){
    const item = $(`#${item_id}`)[0];
    const cmt = item.getElementsByClassName('comment_container')[0];
    const grid = document.getElementsByClassName("cards_container")[0];
    const rowHeight = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-auto-rows'));
    const rowGap = parseInt(window.getComputedStyle(grid).getPropertyValue('grid-row-gap'));
    const rowSpan = Math.ceil((290 + cmt.getBoundingClientRect().height)/(rowHeight+rowGap));
    $(`#${item_id}`).attr("style","grid-row: span "+ rowSpan);
  }

  (function(){
    const header_height = $('#myheader').height();
    const header_blur = $('#myheaderblur');
    header_blur.css('height', `${header_height + 100}px`);

    const footer_height = $('#myfooter').height();
    const footer_blur = $('#myfooterblur');
    footer_blur.css('height', `${footer_height + 100}px`);
})();
  
  
