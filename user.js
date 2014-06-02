var md5 = require('MD5');

exports.user_create = function()
{
  var user = {
    val:{
    name:null,
    email:null,
    last_name:null,
    first_name:null,
    user_type:1,
    password:null,
    token:null,
    fb_toekn:null,
    google_token:null,
    birthday:null,
    address:null,
    gender:null,
    last_login:0,
    locale:null,
    tz_offset:0,
    tz_name:null,
    dst_offset:0,
    disable:false
    },
    set_name:function(name){this.val.name = name.toLowerCase()},
    set_email:function(email){this.val.email = email.toLowerCase()},
    set_last_name:function(name){this.val.last_name = name},
    set_first_name:function(name){this.val.first_name = name},
    set_password:function(pw){this.val.password = md5(this.val.email +':MAIL:'+ pw)},
    set_type:function(type){this.val.user_type = type},
    set_token:function(token){this.val.token = token},
    set_fb_token:function(token){this.val.fb_token = token},
    set_google_token:function(token){this.val.google_token = token},
    set_birthday:function(birth){this.val.birthday = birth},
    set_address:function(addr){this.val.address = addr},
    set_gender:function(g){this.val.gender = g},
    set_last_login:function(time){this.val.last_login = time},
    set_locale:function(locale){this.val.locale = locale},
    set_tz_offset:function(offset){this.val.tz_offset = offset},
    set_tz_name:function(name){this.val.tz_name = name},
    set_dst_offset:function(offset){this.val.dst_offset = offset},
    set_disable:function(disable){this.val.disable = disable }
  };
  return user;
}
