var fs = require('fs');
var path = require('path');

module.exports = {
    sync: function(models, callback){
        var User = models.User;
        var Role = models.Role;
        
        Role.sync().then(function(){
            Role.count().then(function(roleCount){
                if(roleCount === 0){
                    Role.bulkCreate([
                        { name: 'ADMINISTRATOR',    system: true },
                        { name: 'USER',            system: false, default: true }
                    ]).then(function(){
                        console.log("Roles created successfully!");
                        // callback && callback();
                        User.sync().then(function(){
                            User.count().then(function(userCount){
                                if(userCount === 0){
                                    User.bulkCreate([
                                        {
                                            firstname: 'System',
                                            lastname: 'Administrator',
                                            username: 'Administrator',
                                            email: process.env.ADMINISTRATOR_EMAIL || 'sonam.patel@sftpl.com',
                                            password: '@dmin*123',
                                            active: true,
                                            userdata: {},
                                            RoleId: 1
                                        }
                                    ]).then(function(){
                                        console.log("Users created successfully!");
                                        callback && callback();
                                    });
                                }else{
                                    callback && callback();
                                }
                            });
                        });
                    });
                }else{
                    User.sync().then(function () {
                        var UserRecords = User.findAll({
                            attributes: ['id', 'username', 'profileImage'],
                            where: {
                                profileImage: {
                                    $and: [
                                        { $ne: null },
                                        { $ne: "" }
                                    ]
                                }
                            }
                        });

                        UserRecords.then(function (users) {
                            if (users === null || users === undefined) {
                                console.log("Users profile image synced successfully!");
                                callback && callback();
                            } else {
                                users.forEach(function (user, index) {
                                    if (user.username == 'Administrator') {
                                        fs.writeFileSync(path.join(__dirname) + '/../../public/resources/images/profiles/' + 'AdminuserAvatar.jpg', user.profileImage, "base64");
                                    }
                                    else {
                                        fs.writeFileSync(path.join(__dirname) + '/../../public/resources/images/profiles/' + user.id + 'userAvatar.jpg', user.profileImage, "base64");
                                    }
                                });
                                console.log("Users profile image synced successfully!");
                                callback && callback();
                            }
                        });
                    });
                }
            });
        });
    }
};